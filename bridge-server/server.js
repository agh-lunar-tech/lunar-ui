const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dgram = require('dgram');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// UDP server to receive telemetry from lunarterm
const udpServer = dgram.createSocket('udp4');
const TELEMETRY_PORT = 10015;

// Store latest telemetry data
let latestTelemetry = null;

// Frame constants from lunarterm
const FRAME_START_SYMBOL = 0x12;
const TELEMETRY_FRAME = 0x06;
const TELEMETRY_FRAME_PAYLOAD_SIZE = 63;

// Function to parse telemetry data
function parseTelemetryData(payload) {
  if (payload.length < TELEMETRY_FRAME_PAYLOAD_SIZE) {
    console.warn('Telemetry payload too small:', payload.length);
    return null;
  }

  try {
    // Based on the struct format from lunarterm: "<3h 3h h 3i h 6I 2h 2? 3B H"
    let offset = 0;
    
    // IMU Gyroscope data (3 short integers)
    const icm_gyr_x = payload.readInt16LE(offset); offset += 2;
    const icm_gyr_y = payload.readInt16LE(offset); offset += 2;
    const icm_gyr_z = payload.readInt16LE(offset); offset += 2;
    
    // IMU Accelerometer data (3 short integers)
    const icm_acc_x = payload.readInt16LE(offset); offset += 2;
    const icm_acc_y = payload.readInt16LE(offset); offset += 2;
    const icm_acc_z = payload.readInt16LE(offset); offset += 2;
    
    // IMU Temperature (short integer)
    const icm_temp = payload.readInt16LE(offset); offset += 2;
    
    // Magnetometer data (3 integers)
    const mmc_mag_x = payload.readInt32LE(offset); offset += 4;
    const mmc_mag_y = payload.readInt32LE(offset); offset += 4;
    const mmc_mag_z = payload.readInt32LE(offset); offset += 4;
    
    // Magnetometer Temperature (short integer)
    const mmc_temp = payload.readInt16LE(offset); offset += 2;
    
    // Radiation data (6 unsigned integers)
    const rdn_serial_dose = payload.readUInt32LE(offset); offset += 4;
    const rdn_sen1_dose = payload.readUInt32LE(offset); offset += 4;
    const rdn_sen2_dose = payload.readUInt32LE(offset); offset += 4;
    const rdn_serial_intensity = payload.readUInt32LE(offset); offset += 4;
    const rdn_sen1_intensity = payload.readUInt32LE(offset); offset += 4;
    const rdn_sen2_intensity = payload.readUInt32LE(offset); offset += 4;
    
    // Radiation temperature and voltage (2 short integers)
    const rdn_temp = payload.readInt16LE(offset); offset += 2;
    const rdn_vdd = payload.readInt16LE(offset); offset += 2;
    
    // Boolean flags (2 bytes)
    const rdn_crystal_ok = payload.readUInt8(offset) !== 0; offset += 1;
    const rdn_analog_ok = payload.readUInt8(offset) !== 0; offset += 1;
    
    // Sensor data (3 bytes + 1 short)
    const encoder_sensor = payload.readUInt8(offset); offset += 1;
    const hall_endstop = payload.readUInt8(offset); offset += 1;
    const reflective_endstop = payload.readUInt8(offset); offset += 1;
    const light_sensor = payload.readUInt16LE(offset); offset += 2;

    return {
      'icm_gyr_data.x': icm_gyr_x,
      'icm_gyr_data.y': icm_gyr_y,
      'icm_gyr_data.z': icm_gyr_z,
      'icm_acc_data.x': icm_acc_x,
      'icm_acc_data.y': icm_acc_y,
      'icm_acc_data.z': icm_acc_z,
      'icm_temp': icm_temp,
      'mmc_mag_data.x': mmc_mag_x,
      'mmc_mag_data.y': mmc_mag_y,
      'mmc_mag_data.z': mmc_mag_z,
      'mmc_temp': mmc_temp,
      'rdn_serial_dose': rdn_serial_dose,
      'rdn_sen1_dose': rdn_sen1_dose,
      'rdn_sen2_dose': rdn_sen2_dose,
      'rdn_serial_intensity': rdn_serial_intensity,
      'rdn_sen1_intensity': rdn_sen1_intensity,
      'rdn_sen2_intensity': rdn_sen2_intensity,
      'rdn_temp': rdn_temp,
      'rdn_vdd': rdn_vdd,
      'rdn_crystal_ok': rdn_crystal_ok,
      'rdn_analog_ok': rdn_analog_ok,
      'encoder_sensor': encoder_sensor,
      'hall_endstop': hall_endstop,
      'reflective_endstop': reflective_endstop,
      'light_sensor': light_sensor
    };
  } catch (error) {
    console.error('Error parsing telemetry data:', error);
    return null;
  }
}

// UDP server event handlers
udpServer.on('message', (msg, rinfo) => {
  console.log(`Received UDP message from ${rinfo.address}:${rinfo.port}, length: ${msg.length}`);
  
  if (msg.length < 3) {
    console.warn('Message too short');
    return;
  }
  
  // Check for frame start symbol
  if (msg[0] !== FRAME_START_SYMBOL) {
    console.warn('Invalid frame start symbol:', msg[0]);
    return;
  }
  
  const frameType = msg[1];
  const payload = msg.slice(2);
  
  if (frameType === TELEMETRY_FRAME) {
    console.log('Processing telemetry frame');
    const telemetryData = parseTelemetryData(payload);
    
    if (telemetryData) {
      latestTelemetry = telemetryData;
      // Broadcast to all connected clients
      io.emit('telemetry', telemetryData);
      console.log('Telemetry data broadcasted to clients');
    }
  } else {
    console.log('Received non-telemetry frame, type:', frameType);
  }
});

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
});

udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log(`UDP server listening on ${address.address}:${address.port}`);
});

// Start UDP server
udpServer.bind(TELEMETRY_PORT);

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send latest telemetry data to newly connected client
  if (latestTelemetry) {
    socket.emit('telemetry', latestTelemetry);
  }
  
  // Handle command requests from client
  socket.on('command', async (data, callback) => {
    console.log('Received command:', data.command);
    
    try {
      // Here you would implement the logic to send commands to lunarterm
      // For now, we'll simulate a successful command
      const success = await sendCommandToLunarterm(data.command);
      
      if (callback) {
        callback({ success: true, message: 'Command sent successfully' });
      }
    } catch (error) {
      console.error('Error sending command:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Function to send commands to lunarterm
async function sendCommandToLunarterm(command) {
  // This is a placeholder implementation
  // In a real scenario, you would:
  // 1. Connect to lunarterm via serial or network
  // 2. Send the command in the proper format
  // 3. Wait for acknowledgment
  
  console.log(`Sending command to lunarterm: ${command}`);
  
  // Simulate command processing
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate success for now
      resolve(true);
    }, 100);
  });
}

// REST API endpoints
app.get('/api/telemetry', (req, res) => {
  res.json(latestTelemetry);
});

app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  
  try {
    await sendCommandToLunarterm(command);
    res.json({ success: true, message: 'Command sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Bridge server running on port ${PORT}`);
  console.log(`Waiting for telemetry data on UDP port ${TELEMETRY_PORT}`);
}); 