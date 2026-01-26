#!/bin/sh
set -e

echo "🚀 Starting HomelabFlix..."

# Run database migrations
echo "📦 Running database migrations..."
cd /app/server
npx prisma migrate deploy || echo "⚠️  Migrations failed or no migrations to run"

# Start server in background
echo "🔧 Starting backend server..."
cd /app/server
node dist/index.js &
SERVER_PID=$!

# Start client
echo "🌐 Starting frontend..."
cd /app/client
npm start &
CLIENT_PID=$!

# Trap signals and forward to child processes
trap 'kill $SERVER_PID $CLIENT_PID' TERM INT

# Wait for both processes
wait $SERVER_PID
wait $CLIENT_PID
