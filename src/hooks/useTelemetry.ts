import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export const useTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to the bridge server
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    setConnectionStatus('connecting');

    newSocket.on('connect', () => {
      console.log('Connected to bridge server');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from bridge server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('telemetry', (data: TelemetryData) => {
      console.log('Received telemetry:', data);
      setTelemetryData(data);
    });

    newSocket.on('command_response', (response: { success: boolean; message: string }) => {
      console.log('Command response:', response);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendCommand = useCallback(async (command: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket || connectionStatus !== 'connected') {
        reject(new Error('Not connected to bridge server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 5000);

      socket.emit('command', { command }, (response: { success: boolean; message: string }) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.message || 'Command failed'));
        }
      });
    });
  }, [socket, connectionStatus]);

  return {
    telemetryData,
    connectionStatus,
    sendCommand,
  };
}; 