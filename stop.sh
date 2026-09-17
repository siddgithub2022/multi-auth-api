#!/bin/bash
echo "Stopping all Node servers..."
pkill -f "node server.js" 2>/dev/null
pkill -f "http-server" 2>/dev/null
pkill -f "ssh.*localhost.run" 2>/dev/null
echo "Ports freed. Run ./start-all.sh again."
