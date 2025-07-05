import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Thermostat,
  Speed,
  Explore,
  BatteryFull,
  Sensors,
} from '@mui/icons-material';

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

interface TelemetryDisplayProps {
  telemetryData: TelemetryData | null;
}

const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({ telemetryData }) => {
  if (!telemetryData) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No telemetry data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Waiting for data from lunarterm...
        </Typography>
      </Paper>
    );
  }

  const formatValue = (value: number | boolean, unit?: string) => {
    if (typeof value === 'boolean') {
      return value ? 'OK' : 'ERROR';
    }
    return `${value.toFixed(2)}${unit || ''}`;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Telemetry Data
      </Typography>
      
      <Grid container spacing={2}>
        {/* IMU Data */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">IMU - Gyroscope</Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">X: {formatValue(telemetryData['icm_gyr_data.x'], '°/s')}</Typography>
                <Typography variant="body2">Y: {formatValue(telemetryData['icm_gyr_data.y'], '°/s')}</Typography>
                <Typography variant="body2">Z: {formatValue(telemetryData['icm_gyr_data.z'], '°/s')}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Accelerometer
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">X: {formatValue(telemetryData['icm_acc_data.x'], 'g')}</Typography>
                <Typography variant="body2">Y: {formatValue(telemetryData['icm_acc_data.y'], 'g')}</Typography>
                <Typography variant="body2">Z: {formatValue(telemetryData['icm_acc_data.z'], 'g')}</Typography>
              </Box>
              <Typography variant="body2">
                Temperature: {formatValue(telemetryData['icm_temp'], '°C')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Magnetometer Data */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Explore sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Magnetometer</Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">X: {formatValue(telemetryData['mmc_mag_data.x'], 'μT')}</Typography>
                <Typography variant="body2">Y: {formatValue(telemetryData['mmc_mag_data.y'], 'μT')}</Typography>
                <Typography variant="body2">Z: {formatValue(telemetryData['mmc_mag_data.z'], 'μT')}</Typography>
              </Box>
              <Typography variant="body2">
                Temperature: {formatValue(telemetryData['mmc_temp'], '°C')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Radiation Data */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Sensors sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Radiation</Typography>
              </Box>
              <Typography variant="body2">Serial Dose: {formatValue(telemetryData['rdn_serial_dose'])}</Typography>
              <Typography variant="body2">Sensor 1 Dose: {formatValue(telemetryData['rdn_sen1_dose'])}</Typography>
              <Typography variant="body2">Sensor 2 Dose: {formatValue(telemetryData['rdn_sen2_dose'])}</Typography>
              <Typography variant="body2">Crystal: {formatValue(telemetryData['rdn_crystal_ok'])}</Typography>
              <Typography variant="body2">Analog: {formatValue(telemetryData['rdn_analog_ok'])}</Typography>
              <Typography variant="body2">VDD: {formatValue(telemetryData['rdn_vdd'], 'V')}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BatteryFull sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">System Status</Typography>
              </Box>
              <Typography variant="body2">Encoder: {formatValue(telemetryData['encoder_sensor'])}</Typography>
              <Typography variant="body2">Hall Endstop: {formatValue(telemetryData['hall_endstop'])}</Typography>
              <Typography variant="body2">Reflective Endstop: {formatValue(telemetryData['reflective_endstop'])}</Typography>
              <Typography variant="body2">Light Sensor: {formatValue(telemetryData['light_sensor'])}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TelemetryDisplay; 