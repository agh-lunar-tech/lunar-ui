# Lunar Mission Telemetry Simulator

A Python-based simulator that generates realistic telemetry data for the Lunar Mission Control UI. This simulator replaces the YAMCS simulator and provides more accurate and customizable telemetry data.

## Features

- **Realistic Sensor Data**: Generates scientifically plausible telemetry data
- **Orbital Simulation**: Simulates orbital mechanics effects on sensors
- **Thermal Cycling**: Models temperature variations during orbital periods
- **Multiple Scenarios**: Supports different mission scenarios
- **Configurable Rate**: Adjustable telemetry transmission rate
- **UDP Protocol**: Sends data via UDP to match lunarterm format

## Generated Telemetry

The simulator generates data for all sensors that the real lunar system would have:

### IMU (Inertial Measurement Unit)
- **Gyroscope**: 3-axis rotation rates with orbital motion simulation
- **Accelerometer**: Microgravity environment with small perturbations
- **Temperature**: Thermal cycling based on orbital position

### Magnetometer
- **3-axis magnetic field**: Earth's magnetic field variation with orbital position
- **Temperature**: Independent thermal cycling

### Radiation Sensors
- **Multiple detectors**: Serial and two sensor channels
- **Dose measurements**: Accumulated radiation dose with orbital effects
- **Intensity readings**: Real-time radiation intensity
- **Health status**: Crystal and analog circuit health monitoring
- **Power supply**: Supply voltage monitoring

### System Status
- **Encoder**: Position sensor readings
- **Endstops**: Hall effect and reflective limit switches
- **Light sensor**: Ambient light variation with orbital position

## Usage

### Quick Start

```bash
# Run with default settings (1 Hz, nominal scenario)
python3 lunar_simulator.py

# Or use the interactive runner
chmod +x run_simulator.sh
./run_simulator.sh
```

### Advanced Usage

```bash
# Custom rate (10 Hz)
python3 lunar_simulator.py --rate 10.0

# Different target host/port
python3 lunar_simulator.py --host 192.168.1.100 --port 10015

# Anomaly scenario with increased noise
python3 lunar_simulator.py --scenario anomaly

# Eclipse scenario with thermal variations
python3 lunar_simulator.py --scenario eclipse
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--host` | Target host IP address | `127.0.0.1` |
| `--port` | Target UDP port | `10015` |
| `--rate` | Telemetry rate in Hz | `1.0` |
| `--scenario` | Simulation scenario | `nominal` |

### Available Scenarios

1. **Nominal** - Normal mission operations with realistic noise levels
2. **Anomaly** - Increased sensor noise and radiation variations
3. **Eclipse** - Enhanced thermal cycling during eclipse periods

## Integration with Lunar UI

The simulator is designed to work seamlessly with the Lunar Mission Control UI:

1. **Start the Bridge Server**: `cd bridge-server && npm start`
2. **Start the Simulator**: `cd simulator && python3 lunar_simulator.py`
3. **Start the UI**: `cd .. && npm start`

The simulator will automatically connect to the bridge server and begin sending telemetry data.

## Data Format

The simulator generates data in the exact format expected by the bridge server:

- **Frame Structure**: Start symbol (0x12) + Frame type (0x06) + Payload (63 bytes)
- **Binary Format**: Little-endian packed binary data
- **UDP Transport**: Sent via UDP to port 10015

## Simulation Details

### Orbital Mechanics
- **Period**: Simulated orbital period affects magnetic field readings
- **Radiation Belts**: Radiation intensity varies with orbital position
- **Solar/Eclipse**: Light sensor readings change with orbital position

### Thermal Modeling
- **Thermal Cycling**: Temperature variations based on orbital thermal cycle
- **Component Differences**: Different thermal time constants for various sensors
- **Noise Modeling**: Realistic noise levels for each sensor type

### Realistic Variations
- **Sensor Noise**: Appropriate noise levels for each sensor type
- **Health Monitoring**: Occasional health status variations
- **Mechanical Systems**: Encoder and endstop variations

## Example Output

```
🌙 Lunar Mission Telemetry Simulator
==================================================
🚀 Lunar Telemetry Simulator started
📡 Sending telemetry to 127.0.0.1:10015
⏱️  Rate: 1.0 Hz
🛑 Press Ctrl+C to stop

⏱️  Mission Time: 00:05:23 | Orbit: 3.14 | Thermal: 15.71
```

## Troubleshooting

### Connection Issues
- Ensure the bridge server is running on the target host/port
- Check firewall settings for UDP traffic
- Verify the target IP address is correct

### No Data in UI
- Confirm the bridge server is receiving UDP packets
- Check that the simulator is sending to the correct port (10015)
- Verify the UI is connected to the bridge server

### Performance Issues
- Reduce the telemetry rate if the system can't keep up
- Monitor CPU usage during high-rate simulations
- Consider running components on different machines for high-rate testing

## Development

The simulator is designed to be easily extensible:

- **New Sensors**: Add new sensor types in `_generate_telemetry()`
- **New Scenarios**: Add scenario logic in the main function
- **Data Formats**: Modify `_pack_telemetry()` for format changes
- **Physics Models**: Enhance orbital and thermal models for more realism 