#!/bin/bash
# Standalone client for Linux/macOS
echo "=========================================="
echo " Starting STANDALONE CLIENT"
echo " Client: http://localhost:8080"
echo " Server API: http://localhost:3000"
echo "=========================================="
cd "$(dirname "$0")/client"
if [ ! -d "node_modules" ]; then
  echo "Installing client dependencies..."
  npm install
fi
echo "Starting client on http://localhost:8080 ..."
if command -v xdg-open &> /dev/null; then xdg-open http://localhost:8080 &
elif command -v open &> /dev/null; then open http://localhost:8080 &
fi
npx http-server . -p 8080 --cors -c-1
