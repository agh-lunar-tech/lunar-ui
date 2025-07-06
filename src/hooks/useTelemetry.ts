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
  'rdn_serial_dose': number;
  'rdn_sen1_dose': number;
  'rdn_sen2_dose': number;
  'rdn_serial_intensity': number;
  'rdn_sen1_intensity': number;
  'rdn_sen2_intensity': number;
  'rdn_temp': number;
  'rdn_vdd': number;
  'rdn_crystal_ok': boolean;
  'rdn_analog_ok': boolean;
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

// Server configuration - connect to local WebSocket server
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'ws://localhost:2177';

export const useTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [serverConnectionStatus, setServerConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [hardwareConnectionStatus, setHardwareConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [pendingCommands, setPendingCommands] = useState<Map<string, { resolve: (response: CommandResponse) => void, reject: (error: Error) => void }>>(new Map());

  useEffect(() => {
    let socket: WebSocket | null = null;
    
    const connect = () => {
      console.log('🔗 Attempting to connect to WebSocket server:', SERVER_URL);
      socket = new WebSocket(SERVER_URL);
      setWs(socket);
      setServerConnectionStatus('connecting');

      socket.onopen = () => {
        console.log('✅ Connected to bridge server');
        setServerConnectionStatus('connected');
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
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
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