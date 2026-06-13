#!/bin/bash
# Run Worf in development mode
# Requires: Rust, Node.js, Tauri CLI

set -e

echo "🚀 Starting Worf development..."

# Install frontend deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

# Run Tauri dev mode
echo "🦀 Starting Tauri app..."
npx tauri dev
