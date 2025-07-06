#!/bin/bash

echo "🛑 Stopping Lunar Mission Control System..."

# Read PIDs from file if it exists
if [ -f "/tmp/lunar-system-pids.txt" ]; then
    PIDS=$(cat /tmp/lunar-system-pids.txt)
    echo "📋 Found stored PIDs: $PIDS"
    
    for PID in $PIDS; do
        if kill -0 $PID 2>/dev/null; then
            echo "🔄 Stopping process $PID..."
            kill $PID
        else
            echo "⚠️  Process $PID already stopped"
        fi
    done
    
    rm -f /tmp/lunar-system-pids.txt
else
    echo "📋 No PID file found, killing by process name..."
    
    # Kill by process name
    pkill -f "node server.js" && echo "📡 WebSocket server stopped"
    pkill -f "node http-bridge.js" && echo "🌉 HTTP bridge stopped"
    pkill -f "react-scripts start" && echo "🖥️  React app stopped"
fi

# Clean up log files
echo "🧹 Cleaning up log files..."
rm -f /tmp/websocket-server.log /tmp/http-bridge.log /tmp/react-app.log

echo "✅ System stopped!" 