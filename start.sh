#!/bin/bash
set -e

echo ""
echo "⚡ J-MAP — Starting..."
echo ""

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Build and start (--build only rebuilds if files changed)
docker compose up --build -d

echo ""
echo "✅ J-MAP is running!"
echo ""
echo "   Dashboard  →  http://localhost:5173"
echo "   Backend    →  http://localhost:3747"
echo ""
echo "   Load the extension/ folder in chrome://extensions"
echo ""
echo "   To stop:  ./stop.sh  or  docker compose down"
echo ""

# Open browser automatically (Mac/Linux)
if command -v open &> /dev/null; then
  sleep 2 && open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
  sleep 2 && xdg-open http://localhost:5173
fi
