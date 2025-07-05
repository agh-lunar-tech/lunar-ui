#!/usr/bin/env python3
"""
Lunar Mission Telemetry Simulator
Generates realistic sensor data and sends it to the bridge server via UDP
"""

import socket
import struct
import time
import random
import math
import argparse
from threading import Thread

# Frame constants (matching lunarterm format)
FRAME_START_SYMBOL = 0x12
TELEMETRY_FRAME = 0x06
TELEMETRY_FRAME_PAYLOAD_SIZE = 63

# Default configuration
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 10015
DEFAULT_RATE = 1.0  # Hz

class LunarTelemetrySimulator:
    def __init__(self, host=DEFAULT_HOST, port=DEFAULT_PORT, rate=DEFAULT_RATE):
        self.host = host
        self.port = port
        self.rate = rate
        self.running = False
        self.socket = None
        
        # Mission elapsed time
        self.mission_time = 0.0
        
        # Sensor baseline values
        self.baseline = {
            'gyro_noise': 0.1,
            'accel_noise': 0.05,
            'mag_noise': 5.0,
            'temp_variation': 2.0,
            'radiation_base': 1000,
            'radiation_variation': 50,
        }
        
        # Simulation state
        self.orbit_phase = 0.0
        self.thermal_cycle = 0.0
        
    def start(self):
        """Start the simulator"""
        self.running = True
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        print(f"🚀 Lunar Telemetry Simulator started")
        print(f"📡 Sending telemetry to {self.host}:{self.port}")
        print(f"⏱️  Rate: {self.rate} Hz")
        print(f"🛑 Press Ctrl+C to stop")
        print()
        
        try:
            self._simulation_loop()
        except KeyboardInterrupt:
            print("\n🛑 Stopping simulator...")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the simulator"""
        self.running = False
        if self.socket:
            self.socket.close()
        print("✅ Simulator stopped")
    
    def _simulation_loop(self):
        """Main simulation loop"""
        while self.running:
            start_time = time.time()
            
            # Generate and send telemetry
            telemetry_data = self._generate_telemetry()
            self._send_telemetry(telemetry_data)
            
            # Update mission time and phases
            self.mission_time += 1.0 / self.rate
            self.orbit_phase += 0.01  # Slow orbit simulation
            self.thermal_cycle += 0.05  # Thermal cycling
            
            # Print status
            self._print_status()
            
            # Sleep for the remaining time to maintain rate
            elapsed = time.time() - start_time
            sleep_time = max(0, (1.0 / self.rate) - elapsed)
            time.sleep(sleep_time)
    
    def _generate_telemetry(self):
        """Generate realistic telemetry data"""
        
        # IMU Gyroscope (°/s) - small rotations with orbital motion
        gyro_x = int(math.sin(self.orbit_phase) * 10 + random.gauss(0, self.baseline['gyro_noise']) * 100)
        gyro_y = int(math.cos(self.orbit_phase) * 8 + random.gauss(0, self.baseline['gyro_noise']) * 100)
        gyro_z = int(random.gauss(0, self.baseline['gyro_noise']) * 100)
        
        # IMU Accelerometer (g) - microgravity with small perturbations
        accel_x = int(random.gauss(0, self.baseline['accel_noise']) * 1000)
        accel_y = int(random.gauss(0, self.baseline['accel_noise']) * 1000)
        accel_z = int(random.gauss(0.001, self.baseline['accel_noise']) * 1000)  # Slight residual acceleration
        
        # IMU Temperature (°C) - thermal cycling
        imu_temp = int(-10 + 15 * math.sin(self.thermal_cycle) + random.gauss(0, self.baseline['temp_variation']) * 10)
        
        # Magnetometer (μT) - Earth's magnetic field variation
        mag_x = int(-25000 + 5000 * math.sin(self.orbit_phase))
        mag_y = int(15000 + 3000 * math.cos(self.orbit_phase))
        mag_z = int(45000 + 2000 * math.sin(self.orbit_phase * 0.7))
        
        # Magnetometer Temperature
        mag_temp = int(-5 + 10 * math.sin(self.thermal_cycle + 0.5) + random.gauss(0, self.baseline['temp_variation']) * 10)
        
        # Radiation sensors - varying with orbital position
        radiation_multiplier = 1.0 + 0.3 * math.sin(self.orbit_phase * 2)  # Radiation belt effects
        rdn_serial_dose = int(self.baseline['radiation_base'] * radiation_multiplier + random.gauss(0, self.baseline['radiation_variation']))
        rdn_sen1_dose = int(self.baseline['radiation_base'] * radiation_multiplier * 0.9 + random.gauss(0, self.baseline['radiation_variation']))
        rdn_sen2_dose = int(self.baseline['radiation_base'] * radiation_multiplier * 1.1 + random.gauss(0, self.baseline['radiation_variation']))
        
        # Radiation intensity
        rdn_serial_intensity = int(100 + 20 * math.sin(self.orbit_phase * 3))
        rdn_sen1_intensity = int(95 + 18 * math.sin(self.orbit_phase * 3 + 0.2))
        rdn_sen2_intensity = int(105 + 22 * math.sin(self.orbit_phase * 3 + 0.4))
        
        # Radiation temperature and voltage
        rdn_temp = int(20 + 5 * math.sin(self.thermal_cycle + 1.0) + random.gauss(0, 1) * 10)
        rdn_vdd = int(3300 + random.gauss(0, 10))  # 3.3V supply with noise
        
        # System status - mostly OK with occasional variations
        rdn_crystal_ok = random.random() > 0.01  # 99% OK
        rdn_analog_ok = random.random() > 0.005   # 99.5% OK
        
        # Mechanical sensors
        encoder_sensor = int(random.uniform(0, 255))  # Position encoder
        hall_endstop = 1 if random.random() > 0.9 else 0  # Occasionally triggered
        reflective_endstop = 1 if random.random() > 0.95 else 0  # Rarely triggered
        light_sensor = int(1000 + 500 * math.sin(self.orbit_phase) + random.gauss(0, 50))  # Light variation
        
        return {
            'icm_gyr_x': gyro_x,
            'icm_gyr_y': gyro_y,
            'icm_gyr_z': gyro_z,
            'icm_acc_x': accel_x,
            'icm_acc_y': accel_y,
            'icm_acc_z': accel_z,
            'icm_temp': imu_temp,
            'mmc_mag_x': mag_x,
            'mmc_mag_y': mag_y,
            'mmc_mag_z': mag_z,
            'mmc_temp': mag_temp,
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
            'light_sensor': light_sensor,
        }
    
    def _pack_telemetry(self, data):
        """Pack telemetry data into binary format"""
        # Format string: "<3h 3h h 3i h 6I 2h 2? 3B H"
        # < = little endian
        # 3h = 3 short integers (gyro)
        # 3h = 3 short integers (accel)
        # h = 1 short integer (imu temp)
        # 3i = 3 integers (magnetometer)
        # h = 1 short integer (mag temp)
        # 6I = 6 unsigned integers (radiation)
        # 2h = 2 short integers (rad temp, vdd)
        # 2? = 2 booleans (crystal ok, analog ok)
        # 3B = 3 bytes (encoder, endstops)
        # H = 1 unsigned short (light sensor)
        
        try:
            packed = struct.pack(
                "<3h 3h h 3i h 6I 2h 2? 3B H",
                data['icm_gyr_x'], data['icm_gyr_y'], data['icm_gyr_z'],
                data['icm_acc_x'], data['icm_acc_y'], data['icm_acc_z'],
                data['icm_temp'],
                data['mmc_mag_x'], data['mmc_mag_y'], data['mmc_mag_z'],
                data['mmc_temp'],
                data['rdn_serial_dose'], data['rdn_sen1_dose'], data['rdn_sen2_dose'],
                data['rdn_serial_intensity'], data['rdn_sen1_intensity'], data['rdn_sen2_intensity'],
                data['rdn_temp'], data['rdn_vdd'],
                data['rdn_crystal_ok'], data['rdn_analog_ok'],
                data['encoder_sensor'], data['hall_endstop'], data['reflective_endstop'],
                data['light_sensor']
            )
            return packed
        except Exception as e:
            print(f"❌ Error packing telemetry: {e}")
            return None
    
    def _send_telemetry(self, data):
        """Send telemetry data via UDP"""
        packed_data = self._pack_telemetry(data)
        if not packed_data:
            return
        
        # Create frame: start symbol + frame type + payload
        frame = struct.pack('BB', FRAME_START_SYMBOL, TELEMETRY_FRAME) + packed_data
        
        try:
            self.socket.sendto(frame, (self.host, self.port))
        except Exception as e:
            print(f"❌ Error sending telemetry: {e}")
    
    def _print_status(self):
        """Print current simulation status"""
        mission_hours = int(self.mission_time // 3600)
        mission_minutes = int((self.mission_time % 3600) // 60)
        mission_seconds = int(self.mission_time % 60)
        
        print(f"\r⏱️  Mission Time: {mission_hours:02d}:{mission_minutes:02d}:{mission_seconds:02d} | "
              f"Orbit: {self.orbit_phase:.2f} | "
              f"Thermal: {self.thermal_cycle:.2f}", end='', flush=True)

def main():
    parser = argparse.ArgumentParser(description='Lunar Mission Telemetry Simulator')
    parser.add_argument('--host', type=str, default=DEFAULT_HOST, 
                        help=f'Target host (default: {DEFAULT_HOST})')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT,
                        help=f'Target port (default: {DEFAULT_PORT})')
    parser.add_argument('--rate', type=float, default=DEFAULT_RATE,
                        help=f'Telemetry rate in Hz (default: {DEFAULT_RATE})')
    parser.add_argument('--scenario', type=str, choices=['nominal', 'anomaly', 'eclipse'],
                        default='nominal', help='Simulation scenario (default: nominal)')
    
    args = parser.parse_args()
    
    print("🌙 Lunar Mission Telemetry Simulator")
    print("=" * 50)
    
    # Create and start simulator
    simulator = LunarTelemetrySimulator(
        host=args.host,
        port=args.port,
        rate=args.rate
    )
    
    # Adjust simulation parameters based on scenario
    if args.scenario == 'anomaly':
        print("⚠️  Running anomaly scenario")
        simulator.baseline['gyro_noise'] *= 3
        simulator.baseline['radiation_variation'] *= 2
    elif args.scenario == 'eclipse':
        print("🌑 Running eclipse scenario")
        simulator.baseline['temp_variation'] *= 2
    
    simulator.start()

if __name__ == "__main__":
    main() 