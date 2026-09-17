#!/bin/bash
# One-click server for Linux/macOS - any machine
echo "=========================================="
echo " Starting DEDICATED SERVER"
echo " BaseUrl: http://localhost:3000"
echo "=========================================="
cd "$(dirname "$0")/server"
if [ ! -d "node_modules" ]; then
  echo "Installing server dependencies..."
  npm install
fi
echo "Starting server on 0.0.0.0:3000 ..."
node server.js
