import { WebSocketServer, WebSocket } from 'ws';
import readline from 'readline';
import chalk from 'chalk';

const PORT = 2177;
const HOST = '0.0.0.0';  // Listen on all interfaces

// Create WebSocket server
const wss = new WebSocketServer({ host: HOST, port: PORT });

// Store connections
let hardwareConnection = null;
let websiteConnections = new Set();

console.log(chalk.cyan(`WebSocket server starting on ${HOST}:${PORT}...`));

// Create readline interface for commands
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'command> ',
    removeHistoryDuplicates: true
});

// Available commands
const AVAILABLE_COMMANDS = [
    'idle', 'sen_init', 'cut_thermal', 'motor_up', 'img_capture',
    'img_download', 'img_send', 'motor_down', 'led_proc',
    'start_conops', 'reset', 'long'
];

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    const clientAddress = req.socket.remoteAddress;
    console.log(chalk.green(`\nNew connection from ${clientAddress}`));

        // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log(chalk.gray(`\n[DEBUG] Received from ${clientAddress}:`, JSON.stringify(message)));
            
            // Auto-detect connection type based on message patterns
            
            // 1. Check for explicit hardware identification first
            if (message.type === 'hardware_hello') {
                console.log(chalk.green(`\n[HARDWARE CONNECTED] ${message.message || 'Hardware connected'} from ${clientAddress}`));
                hardwareConnection = ws;
                console.log(chalk.green('[HARDWARE] Connection established and ready'));
                
                // Notify all website connections about hardware connection
                websiteConnections.forEach(websiteWs => {
                    if (websiteWs.readyState === WebSocket.OPEN) {
                        websiteWs.send(JSON.stringify({
                            type: 'hardware_status',
                            connected: true
                        }));
                    }
                });
                
                rl.prompt();
                return;
            }
            
            // 2. Website sends commands (simple { command: "idle" } format)
            if (message.command && !message.type && !message.status) {
                // This is a website command
                if (!websiteConnections.has(ws)) {
                    console.log(chalk.blue(`\n[WEBSITE CONNECTED] Command interface from ${clientAddress}`));
                    websiteConnections.add(ws);
                    
                    // Send current hardware status to the new website connection
                    try {
                        ws.send(JSON.stringify({
                            type: 'hardware_status',
                            connected: !!(hardwareConnection && hardwareConnection.readyState === WebSocket.OPEN)
                        }));
                    } catch (error) {
                        console.error(chalk.red('Error sending hardware status:', error));
                    }
                }
                
                console.log(chalk.blue(`\n[WEBSITE COMMAND] Received: ${message.command} from ${clientAddress}`));
                
                // Forward command to hardware
                if (hardwareConnection && hardwareConnection.readyState === WebSocket.OPEN) {
                    console.log(chalk.cyan(`[FORWARDING] Sending command "${message.command}" to hardware`));
                    hardwareConnection.send(JSON.stringify({ command: message.command }));
                } else {
                    console.log(chalk.red('[ERROR] No hardware connection available'));
                    ws.send(JSON.stringify({
                        status: 'error',
                        message: 'No hardware connection available'
                    }));
                }
                return;
            }

            // 3. Hardware sends responses with status field or type field (auto-detection fallback)
            if (message.status !== undefined || (message.type && message.type !== 'server_hello' && message.type !== 'hardware_hello')) {
                // This is hardware communication
                if (hardwareConnection !== ws) {
                    console.log(chalk.green(`\n[HARDWARE CONNECTED] Auto-detected from ${clientAddress}`));
                    hardwareConnection = ws;
                    console.log(chalk.green('[HARDWARE] Connection established and ready'));
                    
                    // Notify all website connections about hardware connection
                    websiteConnections.forEach(websiteWs => {
                        if (websiteWs.readyState === WebSocket.OPEN) {
                            websiteWs.send(JSON.stringify({
                                type: 'hardware_status',
                                connected: true
                            }));
                        }
                    });
                    rl.prompt();
                }
                
                // Continue processing the hardware message below
            }
            
            // Clear current line to prevent message overlap
            process.stdout.clearLine();
            process.stdout.cursorTo(0);

            // Handle command responses from hardware
            if (message.status !== undefined) {
                console.log(chalk.green(`\n[HARDWARE RESPONSE] Status: ${message.status}, Message: ${message.message}`));
                console.log(chalk.cyan(`[FORWARDING] Sending response to ${websiteConnections.size} website client(s)`));
                
                // Forward response to all website connections
                websiteConnections.forEach(websiteWs => {
                    if (websiteWs.readyState === WebSocket.OPEN) {
                        websiteWs.send(JSON.stringify(message));
                    }
                });

                if (message.status === 'success') {
                    console.log(
                        chalk.green('\n[COMMAND SUCCESS]'),
                        chalk.white(message.message),
                        '\n' + chalk.gray(`Port: ${message.port} (${message.port_open ? 'open' : 'closed'})`),
                        '\n' + chalk.gray(`Timestamp: ${new Date(message.timestamp * 1000).toISOString()}`)
                    );
                } else {
                    console.log(
                        chalk.red('\n[COMMAND ERROR]'),
                        chalk.white(message.message)
                    );
                    if (message.available_commands) {
                        console.log(chalk.yellow('Available commands:'));
                        message.available_commands.forEach(cmd => 
                            console.log(chalk.yellow(`  ${cmd}`))
                        );
                    }
                    console.log(chalk.gray(`Timestamp: ${new Date(message.timestamp * 1000).toISOString()}`));
                }
                rl.prompt();
                return;
            }

            // Handle other message types from hardware
            if (message.type) {
                // Forward telemetry and other data to website connections
                websiteConnections.forEach(websiteWs => {
                    if (websiteWs.readyState === WebSocket.OPEN) {
                        websiteWs.send(JSON.stringify(message));
                    }
                });

                switch (message.type) {
                    case 'text':
                        console.log(chalk.blue('\n[TEXT]'), message.payload);
                        break;

                    case 'telemetry':
                        console.log(chalk.yellow('\n[TELEMETRY]'));
                        for (const [key, value] of Object.entries(message.payload)) {
                            console.log(chalk.yellow(`  ${key}:`), value);
                        }
                        break;

                    case 'error':
                        console.log(
                            chalk.red('\n[ERROR]'),
                            `Command: ${message.payload.last_command},`,
                            `Feedback: ${message.payload.last_feedback}`
                        );
                        break;

                    case 'image_complete':
                        console.log(chalk.green('\n[IMAGE]'), `Saved as: ${message.payload.path}`);
                        break;

                    case 'image_init':
                        console.log(chalk.cyan('\n[IMAGE INIT]'));
                        console.log(JSON.stringify(message.payload, null, 2));
                        break;

                    case 'image_part':
                        console.log(chalk.cyan('\n[IMAGE PART]'), `Offset: ${message.payload.offset}`);
                        break;

                    case 'frame':
                        console.log(
                            chalk.magenta('\n[FRAME]'),
                            `Type: ${message.payload.type}`,
                            `Length: ${message.payload.payload.length / 2} bytes`
                        );
                        break;

                    default:
                        console.log(
                            chalk.magenta(`\n[${message.type.toUpperCase()}]`),
                            JSON.stringify(message.payload, null, 2)
                        );
                }
            }

            rl.prompt();
        } catch (error) {
            console.error(chalk.red('\nError parsing message:'), error);
            rl.prompt();
        }
    });

    ws.on('close', () => {
        console.log(chalk.yellow(`\nConnection from ${clientAddress} closed`));
        if (hardwareConnection === ws) {
            hardwareConnection = null;
            console.log(chalk.red('[HARDWARE DISCONNECTED]'));
            
            // Notify all website connections about hardware disconnection
            websiteConnections.forEach(websiteWs => {
                if (websiteWs.readyState === WebSocket.OPEN) {
                    websiteWs.send(JSON.stringify({
                        type: 'hardware_status',
                        connected: false
                    }));
                }
            });
        }
        websiteConnections.delete(ws);
        rl.prompt();
    });

    ws.on('error', (error) => {
        console.error(chalk.red('\nWebSocket error:'), error.message);
        rl.prompt();
    });

    // Send initial connection message (this will help identify if it's a website connection)
    try {
        ws.send(JSON.stringify({ type: 'server_hello', message: 'Connection established' }));
        
        // Send current hardware status to ALL new connections (website will use it, hardware will ignore it)
        ws.send(JSON.stringify({
            type: 'hardware_status',
            connected: !!(hardwareConnection && hardwareConnection.readyState === WebSocket.OPEN)
        }));
        
        console.log(chalk.cyan(`[STATUS] Sent hardware status (${!!(hardwareConnection && hardwareConnection.readyState === WebSocket.OPEN)}) to new connection`));
    } catch (error) {
        console.error(chalk.red('Error sending hello message:', error));
    }

    // Show available commands
    console.log('\nAvailable commands:');
    AVAILABLE_COMMANDS.forEach(cmd => console.log(`  ${cmd}`));
    console.log("\nType 'exit' to quit\n");
    rl.prompt();
});

// Handle command input from terminal
rl.on('line', (line) => {
    const command = line.trim();
    
    if (command.toLowerCase() === 'exit') {
        console.log(chalk.yellow('\nGoodbye!'));
        process.exit(0);
    }

    if (command) {
        if (hardwareConnection && hardwareConnection.readyState === WebSocket.OPEN) {
            console.log(chalk.cyan(`[TERMINAL COMMAND] Sending command "${command}" to hardware`));
            hardwareConnection.send(JSON.stringify({ command }));
        } else {
            console.log(chalk.red('\nNo hardware connection'));
        }
    }

    rl.prompt();
});

rl.on('close', () => {
    console.log(chalk.yellow('\nGoodbye!'));
    process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
    rl.close();
}); 