#!/bin/bash

echo "🚀 Starting Lunar Mission Control System..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."

# Kill processes by port (more reliable)
echo "   Killing processes on port 2177..."
lsof -ti:2177 | xargs -r kill -9 2>/dev/null || true

echo "   Killing processes on port 2178..."
lsof -ti:2178 | xargs -r kill -9 2>/dev/null || true

# Also kill by process name patterns as backup
pkill -f "node server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# Wait for processes to fully terminate
sleep 2

# Get absolute path to avoid directory issues
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "📍 Working from: $SCRIPT_DIR"

# Start WebSocket server using npm start
echo "📡 Starting WebSocket server (port 2177)..."
cd "$SCRIPT_DIR/bridge-server"
nohup npm start > /tmp/websocket-server.log 2>&1 &
WEBSOCKET_PID=$!
echo "   WebSocket server started with PID: $WEBSOCKET_PID"

# Wait for WebSocket server to start
sleep 3

# Start React app using npm start
echo "🖥️  Starting React app (port 2178)..."
cd "$SCRIPT_DIR"
nohup npm start > /tmp/react-app.log 2>&1 &
REACT_PID=$!
echo "   React app started with PID: $REACT_PID"

# Wait for React app to start
sleep 5

echo "✅ All services started!"
echo "📡 WebSocket Server: http://localhost:2177 (PID: $WEBSOCKET_PID)"
echo "🖥️  React App: http://localhost:2178 (PID: $REACT_PID)"
echo ""
echo "🔍 Check logs:"
echo "   tail -f /tmp/websocket-server.log"
echo "   tail -f /tmp/react-app.log"
echo ""
echo "🛑 To stop all services:"
echo "   kill $WEBSOCKET_PID $REACT_PID"

# Store PIDs for easy cleanup
echo "$WEBSOCKET_PID $REACT_PID" > /tmp/lunar-system-pids.txt

echo "🎯 Open your browser to: http://localhost:2178"

# Check if services are actually running
sleep 2
echo ""
echo "🔄 Service status check:"
if ps -p $WEBSOCKET_PID > /dev/null 2>&1; then
    echo "   ✅ WebSocket server is running"
else
    echo "   ❌ WebSocket server failed to start - check /tmp/websocket-server.log"
fi

if ps -p $REACT_PID > /dev/null 2>&1; then
    echo "   ✅ React app is running"
else
    echo "   ❌ React app failed to start - check /tmp/react-app.log"
fi 