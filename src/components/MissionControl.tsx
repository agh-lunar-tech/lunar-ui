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
import LogsDisplay from './LogsDisplay';
import { useTelemetry } from '../hooks/useTelemetry';

const MissionControl: React.FC = () => {
  const { telemetryData, serverConnectionStatus, hardwareConnectionStatus, eddieConnectionStatus, sendCommand, logs, showFrameLogs, setShowFrameLogs } = useTelemetry();
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
            
            {/* Lunarterm Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {hardwareConnectionStatus === 'connected' ? (
                <RadioButtonChecked sx={{ color: 'success.main' }} />
              ) : (
                <RadioButtonUnchecked sx={{ color: 'error.main' }} />
              )}
              <Typography variant="body1" sx={{ ml: 1 }}>
                Lunarterm: {hardwareConnectionStatus}
              </Typography>
            </Box>
            
            {/* Eddie Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {eddieConnectionStatus === 'connected' ? (
                <RadioButtonChecked sx={{ color: 'success.main' }} />
              ) : (
                <RadioButtonUnchecked sx={{ color: 'error.main' }} />
              )}
              <Typography variant="body1" sx={{ ml: 1 }}>
                Eddie: {eddieConnectionStatus}
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
      {serverConnectionStatus === 'connected' && (hardwareConnectionStatus === 'disconnected' || eddieConnectionStatus === 'disconnected') && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Server connected, but {hardwareConnectionStatus === 'disconnected' && eddieConnectionStatus === 'disconnected' ? 'Lunarterm and Eddie are' : hardwareConnectionStatus === 'disconnected' ? 'Lunarterm is' : 'Eddie is'} not connected. {hardwareConnectionStatus === 'disconnected' && eddieConnectionStatus === 'disconnected' ? 'Commands will not be executed.' : 'Some functionality may be limited.'}
        </Alert>
      )}
      {serverConnectionStatus === 'connected' && hardwareConnectionStatus === 'connected' && eddieConnectionStatus === 'connected' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          All systems connected and operational.
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

      {/* Logs Display */}
      <Box sx={{ mt: 3 }}>
        <LogsDisplay 
          logs={logs} 
          showFrameLogs={showFrameLogs} 
          setShowFrameLogs={setShowFrameLogs} 
        />
      </Box>
    </Box>
  );
};

export default MissionControl; 