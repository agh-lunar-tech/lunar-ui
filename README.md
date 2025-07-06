# Lunar Mission Control UI

A modern React-based user interface for monitoring and controlling lunar mission operations. This application connects to the lunarterm system via a WebSocket bridge server, providing real-time telemetry display and command interface.

## Features

- **Real-time Telemetry Display**: View live sensor data including:
  - IMU (Gyroscope and Accelerometer) data
  - Magnetometer readings
  - Radiation sensor data
  - System status indicators
  - Temperature readings

- **Command Interface**: Send commands to the lunarterm system:
  - System control (idle, initialize sensors, start operations)
  - Camera operations (capture, download, send images)
  - Motor and power management
  - LED control

- **Dual Connection Status**: Monitor both server and hardware connections
- **Modern UI**: Dark theme optimized for mission control environments
- **Real-time Command Feedback**: See actual responses from the hardware
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    WebSocket    ┌─────────────────┐
│                 │ ◄────────────► │                 │ ◄─────────────► │                 │
│   React App     │                │  Bridge Server  │                 │   lunarterm     │
│  (Port 2178)    │                │  (Port 2177)    │                 │   (Hardware)    │
└─────────────────┘                └─────────────────┘                 └─────────────────┘
```

The system consists of three main components:

1. **React Frontend** - Modern UI for displaying telemetry and sending commands
2. **Bridge Server** - Node.js WebSocket server that forwards commands and responses
3. **lunarterm (Hardware)** - Python application that communicates with the spacecraft hardware

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### 1. Install Dependencies

```bash
cd lunarterm
npm install
```

This will install dependencies for both the React app and the bridge server.

## How to Run

### Step 1: Start the Bridge Server

```bash
cd lunarterm/bridge-server
node server.js
```

The bridge server will:
- Start listening on port 2177 for WebSocket connections
- Accept connections from both the website and hardware
- Forward commands from website to hardware
- Forward responses from hardware back to website

You should see:
```
WebSocket server starting on 0.0.0.0:2177...
Available commands:
  idle
  sen_init
  cut_thermal
  motor_up
  ...
```

### Step 2: Start the React App

```bash
cd lunarterm
npm start
```

The React app will open in your browser at `http://localhost:2178`

### Step 3: Connect Hardware (lunarterm)

Configure your lunarterm system to connect to the WebSocket server:
- **Server URL**: `ws://[SERVER_IP]:2177`
- **Connection Type**: WebSocket client

The hardware should connect and send identification or telemetry data.

## Connection Status

The website displays dual connection status in the top bar:

- **Server: connected/disconnected** - Connection between website and bridge server
- **Hardware: connected/disconnected** - Connection between bridge server and lunarterm hardware

### Connection Flow

1. **Website → Server**: Website connects to bridge server on port 2177
2. **Hardware → Server**: lunarterm hardware connects to bridge server on port 2177
3. **Command Flow**: Website → Bridge Server → Hardware
4. **Response Flow**: Hardware → Bridge Server → Website

### Status Indicators

- 🟢 **Server: connected, Hardware: connected** - Fully operational
- 🟡 **Server: connected, Hardware: disconnected** - Commands will not be executed
- 🔴 **Server: disconnected, Hardware: disconnected** - No connection to bridge server

## Available Commands

The system supports all lunarterm commands:

- `idle` - Stop all operations
- `sen_init` - Initialize sensors
- `start_conops` - Start concept of operations
- `img_capture` - Capture image
- `img_download` - Download image
- `img_send` - Send image
- `motor_up` / `motor_down` - Motor control
- `cut_thermal` - Thermal knife control
- `led_proc` - LED control
- `reset` - Reset system
- `long` - Long duration operation

## Command Feedback

Unlike traditional systems that show generic "command sent" messages, this system displays **actual hardware responses**:

- **Success**: "Command idle sent to hardware" with port status
- **Error**: Specific error messages from the hardware
- **Timeout**: If hardware doesn't respond within 10 seconds

## Configuration

### Bridge Server Configuration

Edit `bridge-server/server.js` to modify:
- `PORT`: WebSocket server port (default: 2177)
- `HOST`: Server bind address (default: 0.0.0.0 - all interfaces)

### React App Configuration

Edit `src/hooks/useTelemetry.ts` to modify:
- `SERVER_URL`: WebSocket server URL (default: ws://localhost:2177)

You can also use environment variables:
```bash
REACT_APP_SERVER_URL=ws://your-server:2177 npm start
```

## Development

### Hot Reload

Both components support hot reload during development:

```bash
# React app (automatically reloads on changes)
npm start

# Bridge server (restart manually after changes)
cd bridge-server
node server.js
```

### Testing Commands

You can test commands directly from the bridge server terminal:
```
command> idle
command> sen_init
```

## Troubleshooting

### Connection Issues

**Website shows "Server: disconnected"**
- Ensure bridge server is running on port 2177
- Check browser console for WebSocket errors
- Verify no firewall blocking localhost connections

**Website shows "Hardware: disconnected"**
- Ensure lunarterm hardware is running
- Check hardware is configured to connect to correct WebSocket URL
- Verify hardware is sending proper identification or telemetry data

### Command Issues

**Commands timeout or fail**
- Check bridge server logs for error messages
- Ensure hardware connection is stable
- Verify command format matches lunarterm expectations

### Debug Mode

The bridge server includes detailed logging:
- `[WEBSITE COMMAND]` - Commands received from website
- `[HARDWARE RESPONSE]` - Responses from hardware
- `[FORWARDING]` - Message forwarding between connections

## Network Configuration

### Local Development
- Website: `http://localhost:2178`
- Bridge Server: `ws://localhost:2177`

### Remote Hardware
If hardware is on a different machine:
- Bridge Server: `ws://[SERVER_IP]:2177`
- Ensure port 2177 is accessible from hardware machine

## License

This project is part of the Lunar Mission Control System. Please refer to the main project license for usage terms. 