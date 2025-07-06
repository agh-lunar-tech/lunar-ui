import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Satellite,
  RadioButtonChecked,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import TelemetryDisplay from './TelemetryDisplay';
import CommandPanel from './CommandPanel';
import { useTelemetry } from '../hooks/useTelemetry';

const MissionControl: React.FC = () => {
  const { telemetryData, serverConnectionStatus, hardwareConnectionStatus, sendCommand } = useTelemetry();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (telemetryData) {
      setLastUpdate(new Date());
    }
  }, [telemetryData]);

  const handleCommand = async (command: string) => {
    try {
      const response = await sendCommand(command);
      return response;
    } catch (error) {
      console.error('Failed to send command:', error);
      throw error;
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <Paper className="mission-control-header" elevation={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Satellite sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h3" component="h1" gutterBottom>
            Lunar Mission Control
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Server Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {serverConnectionStatus === 'connected' ? (
                <RadioButtonChecked sx={{ color: 'success.main' }} />
              ) : (
                <RadioButtonUnchecked sx={{ color: 'error.main' }} />
              )}
              <Typography variant="body1" sx={{ ml: 1 }}>
                Server: {serverConnectionStatus}
              </Typography>
            </Box>
            
            {/* Hardware Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {hardwareConnectionStatus === 'connected' ? (
                <RadioButtonChecked sx={{ color: 'success.main' }} />
              ) : (
                <RadioButtonUnchecked sx={{ color: 'error.main' }} />
              )}
              <Typography variant="body1" sx={{ ml: 1 }}>
                Hardware: {hardwareConnectionStatus}
              </Typography>
            </Box>
          </Box>
          
          {lastUpdate && (
            <Chip
              label={`Last Update: ${lastUpdate.toLocaleTimeString()}`}
              variant="outlined"
              sx={{ color: 'text.secondary' }}
            />
          )}
        </Box>
      </Paper>

      {/* Status Alert */}
      {serverConnectionStatus === 'disconnected' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No connection to server. Please ensure the bridge server is running on port 2177.
        </Alert>
      )}
      {serverConnectionStatus === 'connected' && hardwareConnectionStatus === 'disconnected' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Server connected, but hardware is not connected. Commands will not be executed.
        </Alert>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Telemetry Display */}
        <Grid item xs={12} lg={8}>
          <TelemetryDisplay telemetryData={telemetryData} />
        </Grid>

        {/* Command Panel */}
        <Grid item xs={12} lg={4}>
          <CommandPanel onSendCommand={handleCommand} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MissionControl; 