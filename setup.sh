#!/usr/bin/env bash
set -e

echo "⚡ JS Hunter - Setup"
echo "===================="

echo ""
echo "→ Installing backend dependencies..."
cd backend && npm install && cd ..

echo ""
echo "→ Installing dashboard dependencies..."
cd dashboard && npm install && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start:"
echo "  Terminal 1: cd backend && npm start"
echo "  Terminal 2: cd dashboard && npm run dev"
echo ""
echo "Then load the extension/ folder in chrome://extensions"
