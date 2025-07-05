# Lunar Mission Control UI

A modern React-based user interface for monitoring and controlling lunar mission operations. This application receives telemetry data from the lunarterm system and provides a user-friendly interface for sending commands to the spacecraft.

## Features

- **Real-time Telemetry Display**: View live sensor data including:
  - IMU (Gyroscope and Accelerometer) data
  - Magnetometer readings
  - Radiation sensor data
  - System status indicators
  - Temperature readings

- **Command Interface**: Send commands to the lunar system:
  - System control (idle, initialize sensors, start operations)
  - Camera operations (capture, download, send images)
  - Motor and power management
  - LED control

- **Modern UI**: Dark theme optimized for mission control environments
- **Real-time Updates**: WebSocket connection for live data streaming
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    UDP:10015    ┌─────────────────┐
│                 │ ◄────────────► │                 │ ◄─────────────► │                 │
│   React App     │                │  Bridge Server  │                 │   lunarterm     │
│  (Port 3000)    │                │  (Port 3001)    │                 │                 │
└─────────────────┘                └─────────────────┘                 └─────────────────┘
```

The system consists of three main components:

1. **React Frontend** - Modern UI for displaying telemetry and sending commands
2. **Bridge Server** - Node.js server that bridges WebSocket (for React) and UDP (for lunarterm)
3. **lunarterm** - Python application that communicates with the spacecraft hardware

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python 3.x (for lunarterm)

## Installation

### 1. Install React App Dependencies

```bash
cd lunar-ui
npm install
# or
yarn install
```

### 2. Install Bridge Server Dependencies

```bash
cd bridge-server
npm install
```

## Running the Application

### Step 1: Start the Bridge Server

```bash
cd bridge-server
npm start
```

The bridge server will:
- Start listening on port 3001 for WebSocket connections
- Start listening on UDP port 10015 for telemetry data from lunarterm

### Step 2: Start the React App

```bash
cd lunar-ui
npm start
```

The React app will open in your browser at `http://localhost:3000`

### Step 3: Start lunarterm (in a separate terminal)

```bash
cd ../lunarterm
python lunarterm.py
```

Or use the built-in simulator for testing:

```bash
cd simulator
python3 lunar_simulator.py
# or use the interactive runner
./run_simulator.sh
```

## Configuration

### Bridge Server Configuration

The bridge server can be configured by modifying `bridge-server/server.js`:

- `TELEMETRY_PORT`: UDP port for receiving telemetry (default: 10015)
- `PORT`: HTTP/WebSocket server port (default: 3001)

### React App Configuration

The React app connects to the bridge server via WebSocket. Update the connection URL in `src/hooks/useTelemetry.ts` if needed:

```typescript
const newSocket = io('http://localhost:3001');
```

## Development

### Hot Reload

Both the React app and bridge server support hot reload during development:

```bash
# React app (automatically reloads on changes)
npm start

# Bridge server (with nodemon)
cd bridge-server
npm run dev
```

### Testing with Simulator

To test the system without actual hardware:

1. Start the bridge server
2. Start the React app
3. Run the built-in lunar simulator:

```bash
cd simulator
python3 lunar_simulator.py --rate 1
```

The built-in simulator provides realistic telemetry data with:
- Orbital mechanics simulation
- Thermal cycling effects
- Radiation environment modeling
- Multiple mission scenarios (nominal, anomaly, eclipse)

For more details, see [simulator/README.md](simulator/README.md).

## Telemetry Data Format

The system processes telemetry frames with the following sensor data:

- **IMU Data**: 3-axis gyroscope and accelerometer readings
- **Magnetometer**: 3-axis magnetic field measurements
- **Radiation**: Multiple radiation sensors with dose and intensity
- **System Status**: Encoder, endstops, and light sensor readings
- **Temperature**: Various temperature sensors throughout the system

## Command Interface

Available commands match the lunarterm system:

- `idle` - Stop all operations
- `sen_init` - Initialize sensors
- `start_conops` - Start concept of operations
- `img_capture` - Capture image
- `img_download` - Download image
- `img_send` - Send image
- `motor_up` / `motor_down` - Motor control
- `cut_thermal` - Thermal knife control
- `led_proc` - LED control

## Troubleshooting

### Connection Issues

- Ensure the bridge server is running on port 3001
- Check that lunarterm is sending UDP packets to port 10015
- Verify firewall settings allow local connections

### No Telemetry Data

- Check that lunarterm is running and connected to hardware
- Verify UDP port 10015 is not blocked
- Use the simulator to test the data flow

### Command Not Working

- Ensure the bridge server has a proper connection to lunarterm
- Check the bridge server logs for error messages
- Verify the command format matches the lunarterm expectations

## License

This project is part of the Lunar Mission Control System. Please refer to the main project license for usage terms. 