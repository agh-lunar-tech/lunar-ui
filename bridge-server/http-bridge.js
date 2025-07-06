import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';

const app = express();
const PORT = 2179;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Store WebSocket connection to the main server
let bridgeWs = null;
let lastResponse = null;
let lastTelemetryData = null;
let responsePromises = new Map();
let hardwareConnected = false;
let lastTelemetryTime = 0;

// Connect to the main WebSocket server
function connectToBridge() {
    bridgeWs = new WebSocket('ws://localhost:2177');
    
    bridgeWs.on('open', () => {
        console.log('🔗 Connected to main WebSocket server');
        
        // Identify as a website connection by sending a dummy command
        // This ensures we receive telemetry forwarding
        setTimeout(() => {
            bridgeWs.send(JSON.stringify({ command: 'bridge_hello' }));
            console.log('📤 Sent bridge identification to register for telemetry forwarding');
        }, 1000);
    });
    
    bridgeWs.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📥 Received from WebSocket:', message);
            
            // Store the last response for polling
            lastResponse = message;
            
            // Detect hardware connection based on message types
            if (message.type === 'telemetry') {
                // Store telemetry data separately
                lastTelemetryData = message.payload;
                hardwareConnected = true;
                lastTelemetryTime = Date.now();
                console.log('📊 Telemetry data received and stored');
            } else if (message.type === 'eddie_log') {
                // Hardware is sending logs - it's connected
                hardwareConnected = true;
                lastTelemetryTime = Date.now();
                console.log('🔧 Hardware detected as CONNECTED (sending logs)');
            } else if (message.type === 'hardware_status') {
                // Explicit hardware status message
                hardwareConnected = message.connected;
                console.log('🔧 Explicit hardware status:', hardwareConnected ? 'CONNECTED' : 'DISCONNECTED');
            }
            
            // Resolve any pending promises
            if (message.status !== undefined) {
                responsePromises.forEach((resolve, key) => {
                    resolve(message);
                    responsePromises.delete(key);
                });
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    bridgeWs.on('close', () => {
        console.log('❌ Disconnected from main WebSocket server');
        bridgeWs = null;
        // Reconnect after 3 seconds
        setTimeout(connectToBridge, 3000);
    });
    
    bridgeWs.on('error', (error) => {
        console.error('🚨 WebSocket error:', error);
    });
}

// HTTP endpoint to get connection status
app.get('/status', (req, res) => {
    // Check if hardware is connected based on recent telemetry data
    const now = Date.now();
    const timeSinceLastTelemetry = now - lastTelemetryTime;
    const isHardwareConnected = hardwareConnected && timeSinceLastTelemetry < 10000; // 10 second timeout
    
    if (hardwareConnected && timeSinceLastTelemetry >= 10000) {
        console.log('⚠️  Hardware timeout - no data received for 10+ seconds');
        hardwareConnected = false;
    }
    
    res.json({
        server_connected: bridgeWs && bridgeWs.readyState === WebSocket.OPEN,
        hardware_connected: isHardwareConnected,
        last_telemetry_age: timeSinceLastTelemetry,
        telemetry_data: lastTelemetryData,
        last_response: lastResponse
    });
});

// HTTP endpoint to send commands
app.post('/command', async (req, res) => {
    const { command } = req.body;
    
    if (!bridgeWs || bridgeWs.readyState !== WebSocket.OPEN) {
        return res.status(503).json({
            error: 'Not connected to bridge server'
        });
    }
    
    try {
        // Send command to WebSocket server
        bridgeWs.send(JSON.stringify({ command }));
        
        // Wait for response (with timeout)
        const responsePromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                responsePromises.delete(command);
                resolve({ status: 'timeout', message: 'Command timed out' });
            }, 10000);
            
            responsePromises.set(command, (response) => {
                clearTimeout(timeoutId);
                resolve(response);
            });
        });
        
        const response = await responsePromise;
        res.json(response);
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to send command',
            details: error.message
        });
    }
});

// Start the HTTP bridge server
app.listen(PORT, () => {
    console.log(`🌉 HTTP Bridge server running on port ${PORT}`);
    console.log(`📡 Status endpoint: http://localhost:${PORT}/status`);
    console.log(`📤 Command endpoint: http://localhost:${PORT}/command`);
    connectToBridge();
}); 