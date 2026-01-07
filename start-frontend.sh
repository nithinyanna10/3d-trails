#!/bin/bash
cd "$(dirname "$0")/frontend" || exit 1

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Start dev server
echo "Starting Vite dev server on http://localhost:5173"
echo "Press Ctrl+C to stop"
npm run dev

