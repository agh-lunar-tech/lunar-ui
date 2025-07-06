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
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [pendingCommands, setPendingCommands] = useState<Map<string, { resolve: (response: CommandResponse) => void, reject: (error: Error) => void }>>(new Map());

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
        
        // Identify as a website connection by sending a dummy command
        // This ensures we receive telemetry forwarding from the server
        setTimeout(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ command: 'website_hello' }));
            console.log('📤 Sent website identification to register for telemetry forwarding');
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
        setWs(null);
        
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
            console.log('🔧 Hardware connection status update:', message.connected);
            setHardwareConnectionStatus(message.connected ? 'connected' : 'disconnected');
            return;
          }
          
          // Handle telemetry data
          if (message.type === 'telemetry' && message.payload) {
            console.log('Received telemetry:', message.payload);
            setTelemetryData(message.payload);
          }
          
          // Handle other message types (text, error, etc.)
          if (message.type && message.type !== 'server_hello') {
            console.log(`Received ${message.type}:`, message.payload);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        setServerConnectionStatus('disconnected');
        setHardwareConnectionStatus('disconnected');
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
    sendCommand,
  };
}; 