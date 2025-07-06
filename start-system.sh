#!/bin/bash

echo "🚀 Starting Lunar Mission Control System..."

# Kill any existing processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node http-bridge.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# Start WebSocket server
echo "📡 Starting WebSocket server (port 2177)..."
cd bridge-server
node server.js > /tmp/websocket-server.log 2>&1 &
WEBSOCKET_PID=$!

# Wait a moment for WebSocket server to start
sleep 2

# Start HTTP bridge
echo "🌉 Starting HTTP bridge (port 2179)..."
node http-bridge.js > /tmp/http-bridge.log 2>&1 &
HTTP_BRIDGE_PID=$!

# Wait a moment for HTTP bridge to start
sleep 2

# Start React app
echo "🖥️  Starting React app (port 2178)..."
cd ..
npm start > /tmp/react-app.log 2>&1 &
REACT_PID=$!

echo "✅ All services started!"
echo "📊 WebSocket Server: http://localhost:2177 (PID: $WEBSOCKET_PID)"
echo "🌉 HTTP Bridge: http://localhost:2179 (PID: $HTTP_BRIDGE_PID)"
echo "🖥️  React App: http://localhost:2178 (PID: $REACT_PID)"
echo ""
echo "🔍 Check logs:"
echo "   tail -f /tmp/websocket-server.log"
echo "   tail -f /tmp/http-bridge.log"
echo "   tail -f /tmp/react-app.log"
echo ""
echo "🛑 To stop all services:"
echo "   kill $WEBSOCKET_PID $HTTP_BRIDGE_PID $REACT_PID"

# Store PIDs for easy cleanup
echo "$WEBSOCKET_PID $HTTP_BRIDGE_PID $REACT_PID" > /tmp/lunar-system-pids.txt

echo "🎯 Open your browser to: http://localhost:2178" 