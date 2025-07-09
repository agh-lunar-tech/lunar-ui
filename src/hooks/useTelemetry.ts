import { useState, useEffect, useCallback } from 'react';

interface TelemetryData {
  'icm_gyr_data.x': number;
  'icm_gyr_data.y': number;
  'icm_gyr_data.z': number;
  'icm_acc_data.x': number;
  'icm_acc_data.y': number;
  'icm_acc_data.z': number;
  'icm_temp': number;
  'mmc_mag_data.x': number;
  'mmc_mag_data.y': number;
  'mmc_mag_data.z': number;
  'mmc_temp': number;
  'rdn_serial_dose'?: number;
  'rdn_sen1_dose'?: number;
  'rdn_sen2_dose'?: number;
  'rdn_serial_intensity'?: number;
  'rdn_sen1_intensity'?: number;
  'rdn_sen2_intensity'?: number;
  'rdn_temp'?: number;
  'rdn_vdd'?: number;
  'rdn_crystal_ok'?: boolean;
  'rdn_analog_ok'?: boolean;
  'encoder_sensor': number;
  'hall_endstop': number;
  'reflective_endstop': number;
  'light_sensor': number;
}

interface CommandResponse {
  status: 'success' | 'error';
  message: string;
  port?: string;
  port_open?: boolean;
  timestamp?: number;
  available_commands?: string[];
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface LogMessage {
  timestamp: Date;
  type: string;
  content: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

// Server configuration - connect to WebSocket server on the same host as the web page
const getServerUrl = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_SERVER_URL) {
    console.log('📍 Using SERVER_URL from environment:', process.env.REACT_APP_SERVER_URL);
    return process.env.REACT_APP_SERVER_URL;
  }
  
  // Get current page details
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  
  // For local development, use localhost with port 2177
  if (host === 'localhost' || host === '127.0.0.1') {
    const url = `ws://${host}:2177`;
    console.log('📍 Local development - Generated WebSocket URL:', url);
    return url;
  }
  
  // For remote access, use the same domain with wss (assuming the WebSocket is available at the same domain)
  const url = `${protocol}//${host}`;
  console.log('📍 Remote access - Generated WebSocket URL:', url);
  console.log('📍 Current page location:', window.location.href);
  console.log('📍 Protocol:', protocol, 'Host:', host);
  return url;
};

// Remove the global SERVER_URL - we'll generate it inside the component

export const useTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [serverConnectionStatus, setServerConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [hardwareConnectionStatus, setHardwareConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [eddieConnectionStatus, setEddieConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [pendingCommands, setPendingCommands] = useState<Map<string, { resolve: (response: CommandResponse) => void, reject: (error: Error) => void }>>(new Map());
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [showFrameLogs, setShowFrameLogs] = useState<boolean>(false);

  // Heartbeat tracking
  const [lunartermLastHeartbeat, setLunartermLastHeartbeat] = useState<Date | null>(null);
  const [eddieLastHeartbeat, setEddieLastHeartbeat] = useState<Date | null>(null);

  const addLog = useCallback((type: string, content: string, level: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const logMessage: LogMessage = {
      timestamp: new Date(),
      type,
      content,
      level
    };
    setLogs(prev => [...prev.slice(-999), logMessage]); // Keep last 1000 logs
  }, []);

  // Heartbeat monitoring - check every 5 seconds
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeoutThreshold = 15000; // 15 seconds
      
      // Check Lunarterm heartbeat
      if (lunartermLastHeartbeat) {
        const timeSinceLastHeartbeat = now.getTime() - lunartermLastHeartbeat.getTime();
        if (timeSinceLastHeartbeat > timeoutThreshold) {
          setHardwareConnectionStatus('disconnected');
          addLog('LUNARTERM_STATUS', 'Lunarterm heartbeat timeout - disconnected', 'warning');
          setLunartermLastHeartbeat(null);
        }
      }
      
      // Check Eddie heartbeat
      if (eddieLastHeartbeat) {
        const timeSinceLastHeartbeat = now.getTime() - eddieLastHeartbeat.getTime();
        if (timeSinceLastHeartbeat > timeoutThreshold) {
          setEddieConnectionStatus('disconnected');
          addLog('EDDIE_STATUS', 'Eddie heartbeat timeout - disconnected', 'warning');
          setEddieLastHeartbeat(null);
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(heartbeatInterval);
  }, [lunartermLastHeartbeat, eddieLastHeartbeat, addLog]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;
    
    const connect = () => {
      if (!isComponentMounted) return;
      
      // Generate the WebSocket URL when actually connecting
      const SERVER_URL = getServerUrl();
      console.log('🔗 Generated WebSocket URL:', SERVER_URL);
      console.log('🔗 Attempting to connect to WebSocket server:', SERVER_URL);
      console.log('🔗 WebSocket readyState before connection:', socket?.readyState);
      
      try {
        socket = new WebSocket(SERVER_URL);
        console.log('🔗 WebSocket created successfully');
        setWs(socket);
        setServerConnectionStatus('connecting');
      } catch (error) {
        console.error('🚨 Failed to create WebSocket:', error);
        setServerConnectionStatus('disconnected');
        return;
      }

      socket.onopen = () => {
        console.log('✅ Connected to bridge server');
        setServerConnectionStatus('connected');
        addLog('CONNECTION', 'Connected to bridge server', 'success');
        
        // Identify as a website connection by sending a dummy command
        // This ensures we receive telemetry forwarding from the server
        setTimeout(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ command: 'website_hello' }));
            console.log('📤 Sent website identification to register for telemetry forwarding');
            addLog('CONNECTION', 'Sent website identification', 'info');
          }
        }, 1000);
        
        // Clear any pending reconnection attempts
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      socket.onclose = (event) => {
        console.log('❌ Disconnected from bridge server. Code:', event.code, 'Reason:', event.reason);
        setServerConnectionStatus('disconnected');
        setHardwareConnectionStatus('disconnected');
        setEddieConnectionStatus('disconnected');
        setLunartermLastHeartbeat(null);
        setEddieLastHeartbeat(null);
        setWs(null);
        addLog('CONNECTION', `Disconnected from bridge server (Code: ${event.code})`, 'error');
        
        // Reject all pending commands
        setPendingCommands(prev => {
          prev.forEach(({ reject }) => {
            reject(new Error('Connection lost'));
          });
          return new Map();
        });
        
        // Only reconnect if the component is still mounted and the connection wasn't closed intentionally
        if (isComponentMounted && event.code !== 1000) {
          console.log('🔄 Scheduling reconnection in 3 seconds...');
          addLog('CONNECTION', 'Attempting to reconnect in 3 seconds...', 'warning');
          reconnectTimeout = setTimeout(() => {
            if (isComponentMounted) {
              connect();
            }
          }, 3000);
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 Received message:', message);
          
          // Handle command responses
          if (message.status !== undefined) {
            console.log('Received command response:', message);
            addLog('COMMAND_RESPONSE', 
              `Status: ${message.status}, Message: ${message.message}`, 
              message.status === 'success' ? 'success' : 'error'
            );
            
            // For now, resolve the most recent pending command
            // In a more sophisticated system, we'd match commands by ID
            setPendingCommands(prev => {
              const firstCommand = Array.from(prev.entries())[0];
              if (firstCommand) {
                const [commandKey, { resolve }] = firstCommand;
                resolve(message as CommandResponse);
                const newMap = new Map(prev);
                newMap.delete(commandKey);
                return newMap;
              }
              return prev;
            });
            return;
          }
          
          // Handle hardware connection status
          if (message.type === 'hardware_status') {
            console.log('🔧 Lunarterm connection status update:', message.connected);
            setHardwareConnectionStatus(message.connected ? 'connected' : 'disconnected');
            addLog('HARDWARE_STATUS', 
              `Lunarterm ${message.connected ? 'connected' : 'disconnected'}`, 
              message.connected ? 'success' : 'warning'
            );
            return;
          }
          
          // Handle eddie_log messages
          if (message.type === 'eddie_log' && message.payload) {
            const cleanMessage = message.payload.message.replace(/\u0000+/g, '').trim();
            const timestamp = new Date(message.payload.timestamp * 1000).toLocaleTimeString();
            
            // Check for heartbeat messages
            if (cleanMessage.includes('[LUNARTERM] [DEBUG] Heartbeat')) {
              setLunartermLastHeartbeat(new Date());
              setHardwareConnectionStatus('connected');
              addLog('LUNARTERM_STATUS', 'Lunarterm heartbeat received - connected', 'success');
            } else if (cleanMessage.includes('[EDDIE] [DEBUG] Heartbeat')) {
              setEddieLastHeartbeat(new Date());
              setEddieConnectionStatus('connected');
              addLog('EDDIE_STATUS', 'Eddie heartbeat received - connected', 'success');
            }
            
            addLog('EDDIE_LOG', `[${timestamp}] ${cleanMessage}`, 'info');
          }
          
          // Handle telemetry data
          if (message.type === 'telemetry' && message.payload) {
            console.log('Received telemetry:', message.payload);
            setTelemetryData(message.payload);
            addLog('TELEMETRY', 'Sensor data updated', 'info');
          }
          
          // Handle text messages
          if (message.type === 'text' && message.payload) {
            addLog('TEXT', message.payload, 'info');
          }
          
          // Handle error messages
          if (message.type === 'error' && message.payload) {
            addLog('ERROR', 
              `Command: ${message.payload.last_command}, Feedback: ${message.payload.last_feedback}`, 
              'error'
            );
          }
          
          // Handle image messages
          if (message.type === 'image_complete' && message.payload) {
            addLog('IMAGE', `Image saved: ${message.payload.path}`, 'success');
          }
          
          // Handle frame messages (only if enabled)
          if (message.type === 'frame') {
            if (showFrameLogs) {
              addLog('FRAME', 
                `Type: ${message.payload.type}, Length: ${message.payload.payload.length / 2} bytes`, 
                'info'
              );
            }
            // Skip frame messages if showFrameLogs is false
            return;
          }
          
          // Handle other message types (but skip server_hello and frame)
          if (message.type && message.type !== 'server_hello' && message.type !== 'telemetry' && message.type !== 'eddie_log' && message.type !== 'text' && message.type !== 'error' && message.type !== 'image_complete' && message.type !== 'frame') {
            addLog(message.type.toUpperCase(), JSON.stringify(message.payload), 'info');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          addLog('ERROR', 'Failed to parse WebSocket message', 'error');
        }
      };

      socket.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        setServerConnectionStatus('disconnected');
        setHardwareConnectionStatus('disconnected');
        setEddieConnectionStatus('disconnected');
        setLunartermLastHeartbeat(null);
        setEddieLastHeartbeat(null);
        setWs(null);
      };
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000); // Normal closure
      }
    };
  }, []);

  const sendCommand = useCallback(async (command: string): Promise<CommandResponse> => {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected to bridge server'));
        return;
      }

      try {
        // Generate a unique key for this command
        const commandKey = `${command}-${Date.now()}`;
        
        // Store the promise resolvers
        setPendingCommands(prev => new Map(prev).set(commandKey, { resolve, reject }));
        
        // Send the command
        console.log('📤 Sending command to server:', command);
        ws.send(JSON.stringify({ command }));
        addLog('COMMAND_SENT', `Sent command: ${command}`, 'info');
        
        // Set a timeout to reject if no response
        setTimeout(() => {
          setPendingCommands(prev => {
            const newMap = new Map(prev);
            if (newMap.has(commandKey)) {
              newMap.delete(commandKey);
              reject(new Error(`Command "${command}" timed out`));
            }
            return newMap;
          });
        }, 10000); // 10 second timeout
        
      } catch (error) {
        reject(error);
      }
    });
  }, [ws]);

  return {
    telemetryData,
    serverConnectionStatus,
    hardwareConnectionStatus,
    eddieConnectionStatus,
    sendCommand,
    logs,
    showFrameLogs,
    setShowFrameLogs,
  };
}; 