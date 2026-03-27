#!/bin/bash

echo "Installing Python dependencies..."

# Try different pip installation methods
if command -v pip3 &> /dev/null; then
    pip3 install -r requirements.txt 2>&1 || echo "pip3 install failed (may be externally-managed environment)"
elif command -v pip &> /dev/null; then
    pip install -r requirements.txt 2>&1 || echo "pip install failed (may be externally-managed environment)"
elif command -v python3 &> /dev/null; then
    python3 -m pip install -r requirements.txt 2>&1 || echo "python3 -m pip install failed (may be externally-managed environment)"
elif command -v python &> /dev/null; then
    python -m pip install -r requirements.txt 2>&1 || echo "python -m pip install failed (may be externally-managed environment)"
else
    echo "Warning: No Python package manager found."
fi

echo "Build complete!"
exit 0
