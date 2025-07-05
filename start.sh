#!/bin/bash

# Lunar Mission Control UI Startup Script
echo "🚀 Starting Lunar Mission Control UI..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
if ! command_exists node; then
    echo "❌ Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed. Please install npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing React app dependencies..."
    npm install
fi

if [ ! -d "bridge-server/node_modules" ]; then
    echo "📦 Installing bridge server dependencies..."
    cd bridge-server
    npm install
    cd ..
fi

# Create logs directory
mkdir -p logs

# Start the bridge server in the background
echo "🌉 Starting bridge server..."
cd bridge-server
npm start > ../logs/bridge-server.log 2>&1 &
BRIDGE_PID=$!
cd ..

# Wait a moment for the bridge server to start
sleep 2

# Start the React app
echo "⚛️  Starting React app..."
echo "📱 The app will open in your browser at http://localhost:3000"
echo "🔌 Bridge server is running on http://localhost:3001"
echo ""
echo "💡 To test with simulated data, run in another terminal:"
echo "   cd simulator && python3 lunar_simulator.py"
echo ""
echo "To stop the application, press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BRIDGE_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start React app (this will block)
npm start

# This should not be reached normally
cleanup 