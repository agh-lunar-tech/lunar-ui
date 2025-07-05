#!/bin/bash

# Lunar Simulator Runner Script

echo "🌙 Lunar Mission Telemetry Simulator"
echo "===================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Show available options
echo "Available scenarios:"
echo "  1. Nominal mission (default)"
echo "  2. Anomaly scenario (increased noise)"
echo "  3. Eclipse scenario (thermal variations)"
echo ""

# Get user choice
read -p "Select scenario (1-3) or press Enter for nominal: " choice

case $choice in
    1|"")
        echo "🚀 Running nominal mission scenario"
        python3 lunar_simulator.py --rate 1.0
        ;;
    2)
        echo "⚠️  Running anomaly scenario"
        python3 lunar_simulator.py --rate 1.0 --scenario anomaly
        ;;
    3)
        echo "🌑 Running eclipse scenario"
        python3 lunar_simulator.py --rate 1.0 --scenario eclipse
        ;;
    *)
        echo "❌ Invalid choice. Running nominal scenario."
        python3 lunar_simulator.py --rate 1.0
        ;;
esac 