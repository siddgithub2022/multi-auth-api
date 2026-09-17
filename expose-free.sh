#!/bin/bash
# Free public URL for Linux/macOS
echo "=========================================="
echo " FREE PUBLIC URL"
echo "=========================================="
if command -v cloudflared &> /dev/null; then
  echo "Using Cloudflare Tunnel..."
  cloudflared tunnel --url http://localhost:3000
elif command -v ssh &> /dev/null; then
  echo "Using localhost.run via SSH..."
  ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
else
  echo "Install cloudflared or openssh-client"
fi
