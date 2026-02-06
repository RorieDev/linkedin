#!/bin/bash

# LinkedIn Poster - Startup Script
# Starts both frontend (Vite) and backend (Express) servers

set -e

echo "🚀 Starting LinkedIn Poster..."
echo ""

# Check if .env file exists
if [ ! -f "mcp-server/.env" ]; then
    echo "❌ Error: mcp-server/.env not found"
    echo "Please create the .env file with your API keys:"
    echo "  LINKEDIN_CLIENT_ID"
    echo "  LINKEDIN_CLIENT_SECRET"
    echo "  LINKEDIN_REDIRECT_URI"
    echo "  OPENAI_API_KEY"
    exit 1
fi

# Kill any existing processes on ports 5173 and 4000
echo "Cleaning up any existing processes..."
pkill -f "vite" || true
pkill -f "node.*server.js" || true
sleep 1

# Start backend server
echo "📡 Starting backend server on http://localhost:4000..."
cd mcp-server
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check backend.log:"
    cat backend.log
    exit 1
fi

echo "✅ Backend running (PID: $BACKEND_PID)"

# Start frontend server
echo "🎨 Starting frontend server on http://localhost:5173..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start. Check frontend.log:"
    cat frontend.log
    kill $BACKEND_PID
    exit 1
fi

echo "✅ Frontend running (PID: $FRONTEND_PID)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 LinkedIn Poster is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:4000"
echo ""
echo "Logs:"
echo "  Frontend: tail -f frontend.log"
echo "  Backend:  tail -f backend.log"
echo ""
echo "To stop both servers: npm run stop"
echo ""

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down LinkedIn Poster..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ Servers stopped"
}

trap cleanup EXIT

# Keep script running
wait
