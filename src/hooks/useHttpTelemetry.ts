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

interface BridgeStatus {
  server_connected: boolean;
  hardware_connected: boolean;
  telemetry_data: TelemetryData | null;
  last_response: any;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

// HTTP Bridge server configuration
const BRIDGE_URL = 'http://localhost:2179';

export const useHttpTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [serverConnectionStatus, setServerConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [hardwareConnectionStatus, setHardwareConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // Poll status every 2 seconds
  useEffect(() => {
    const pollStatus = async () => {
      try {
        console.log('📡 Polling status from HTTP bridge...');
        const response = await fetch(`${BRIDGE_URL}/status`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const status: BridgeStatus = await response.json();
        console.log('📥 Received status:', status);
        
        // Update connection status
        setServerConnectionStatus(status.server_connected ? 'connected' : 'disconnected');
        setHardwareConnectionStatus(status.hardware_connected ? 'connected' : 'disconnected');
        
        // Handle telemetry data from dedicated field
        if (status.telemetry_data) {
          console.log('📊 Received telemetry data:', status.telemetry_data);
          setTelemetryData(status.telemetry_data);
        }
        
      } catch (error) {
        console.error('🚨 HTTP bridge error:', error);
        setServerConnectionStatus('disconnected');
        setHardwareConnectionStatus('disconnected');
      }
    };

    // Initial poll
    pollStatus();
    
    // Set up polling interval
    const interval = setInterval(pollStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const sendCommand = useCallback(async (command: string): Promise<CommandResponse> => {
    console.log('📤 Sending command via HTTP:', command);
    
    try {
      const response = await fetch(`${BRIDGE_URL}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: CommandResponse = await response.json();
      console.log('📥 Command response:', result);
      return result;
      
    } catch (error) {
      console.error('🚨 Command error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send command');
    }
  }, []);

  return {
    telemetryData,
    serverConnectionStatus,
    hardwareConnectionStatus,
    sendCommand,
  };
}; 