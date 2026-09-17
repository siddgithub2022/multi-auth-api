#!/bin/bash
# One-click run anywhere - Linux/macOS
echo "=========================================="
echo " ONE-CLICK RUN ANYWHERE"
echo " Server: http://localhost:3000"
echo " Client: http://localhost:8080"
echo "=========================================="
DIR="$(dirname "$0")"
chmod +x "$DIR/start-server.sh" "$DIR/start-client.sh"
# Start server in background
bash "$DIR/start-server.sh" &
SERVER_PID=$!
sleep 4
bash "$DIR/start-client.sh" &
sleep 3
echo "Opening browsers..."
if command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000 &
  xdg-open http://localhost:3000/dashboard.html &
elif command -v open &> /dev/null; then
  open http://localhost:3000 &
  open http://localhost:3000/dashboard.html &
fi
echo "Server PID $SERVER_PID - press Ctrl+C to stop"
wait $SERVER_PID
