#!/bin/bash
cd "$(dirname "$0")/backend" || exit 1

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Upgrade pip first
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

# Install dependencies directly (no venv)
echo "Installing dependencies (this may take a few minutes)..."
python3 -m pip install -r requirements.txt

# Start server
echo ""
echo "✓ All dependencies installed!"
echo "Starting FastAPI server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""
python3 -m uvicorn main:app --reload --port 8000

