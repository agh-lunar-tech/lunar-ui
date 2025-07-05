import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  CameraAlt,
  FlashOn,
  ArrowUpward,
  ArrowDownward,
  Sensors,
  Settings,
} from '@mui/icons-material';

interface CommandPanelProps {
  onSendCommand: (command: string) => Promise<void>;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ onSendCommand }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCommand = async (command: string, label: string) => {
    try {
      setLoading(command);
      await onSendCommand(command);
      setNotification({
        open: true,
        message: `${label} command sent successfully`,
        severity: 'success',
      });
    } catch (error) {
      setNotification({
        open: true,
        message: `Failed to send ${label} command`,
        severity: 'error',
      });
    } finally {
      setLoading(null);
    }
  };

  const commands = [
    {
      category: 'System Control',
      items: [
        { id: 'idle', label: 'Idle', icon: <Stop />, variant: 'outlined' as const },
        { id: 'sen_init', label: 'Initialize Sensors', icon: <Sensors />, variant: 'contained' as const },
        { id: 'start_conops', label: 'Start ConOps', icon: <PlayArrow />, variant: 'contained' as const },
      ],
    },
    {
      category: 'Camera Operations',
      items: [
        { id: 'img_capture', label: 'Capture Image', icon: <CameraAlt />, variant: 'contained' as const },
        { id: 'img_download', label: 'Download Image', icon: <ArrowDownward />, variant: 'contained' as const },
        { id: 'img_send', label: 'Send Image', icon: <ArrowUpward />, variant: 'contained' as const },
      ],
    },
    {
      category: 'Motor & Power',
      items: [
        { id: 'motor_up', label: 'Motor Up', icon: <ArrowUpward />, variant: 'contained' as const },
        { id: 'motor_down', label: 'Motor Down', icon: <ArrowDownward />, variant: 'contained' as const },
        { id: 'cut_thermal', label: 'Cut Thermal', icon: <Settings />, variant: 'outlined' as const },
        { id: 'led_proc', label: 'LED Process', icon: <FlashOn />, variant: 'contained' as const },
      ],
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Command Panel
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Send commands to the lunarterm system. Use with caution.
      </Alert>

      {commands.map((category) => (
        <Card key={category.category} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {category.category}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {category.items.map((command) => (
                <Grid item xs={12} sm={6} key={command.id}>
                  <Button
                    fullWidth
                    variant={command.variant}
                    startIcon={command.icon}
                    onClick={() => handleCommand(command.id, command.label)}
                    disabled={loading === command.id}
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 'medium',
                    }}
                  >
                    {loading === command.id ? 'Sending...' : command.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ))}

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CommandPanel; 