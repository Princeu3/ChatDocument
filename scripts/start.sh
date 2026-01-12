#!/bin/bash

# Chat Document - Start Script
# This script starts Supabase, backend, and frontend servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Chat Document - Starting Services"
echo "=========================================="
echo ""

# Create PID directory
PID_DIR="$PROJECT_DIR/.pids"
mkdir -p "$PID_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker is running"

# Check for .env file
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${RED}Error: backend/.env file not found${NC}"
    echo "Run ./scripts/setup.sh first"
    exit 1
fi

# Start Supabase
echo ""
echo "Starting Supabase (local)..."
cd "$PROJECT_DIR"

# Check if Supabase is already running
if supabase status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Supabase is already running"
else
    supabase start
    echo -e "${GREEN}✓${NC} Supabase started"
fi

# Display Supabase URLs
echo ""
echo -e "${BLUE}Supabase Services:${NC}"
supabase status | grep -E "(API URL|Studio URL|DB URL)" || true
echo ""

# Check if backend is already running
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Backend is already running (PID: $BACKEND_PID)${NC}"
    else
        rm "$PID_DIR/backend.pid"
    fi
fi

# Check if frontend is already running
if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Frontend is already running (PID: $FRONTEND_PID)${NC}"
    else
        rm "$PID_DIR/frontend.pid"
    fi
fi

# Start Backend
if [ ! -f "$PID_DIR/backend.pid" ]; then
    echo "Starting Backend (FastAPI)..."
    cd "$PROJECT_DIR/backend"

    # Create logs directory
    mkdir -p "$PROJECT_DIR/logs"

    # Start uvicorn in background
    nohup uv run uvicorn main:app --host 0.0.0.0 --port 8000 > "$PROJECT_DIR/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PID_DIR/backend.pid"

    # Wait a moment and check if it started
    sleep 2
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
        echo -e "  ${BLUE}→${NC} API: http://localhost:8000"
        echo -e "  ${BLUE}→${NC} Docs: http://localhost:8000/docs"
    else
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo "Check logs/backend.log for errors"
        rm "$PID_DIR/backend.pid"
    fi
fi

# Start Frontend
if [ ! -f "$PID_DIR/frontend.pid" ]; then
    echo "Starting Frontend (Next.js)..."
    cd "$PROJECT_DIR/frontend"

    # Start Next.js in background
    nohup bun run dev > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PID_DIR/frontend.pid"

    # Wait a moment and check if it started
    sleep 3
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"
        echo -e "  ${BLUE}→${NC} App: http://localhost:3000"
    else
        echo -e "${RED}✗ Frontend failed to start${NC}"
        echo "Check logs/frontend.log for errors"
        rm "$PID_DIR/frontend.pid"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  All Services Started!${NC}"
echo "=========================================="
echo ""
echo "Services:"
echo -e "  ${BLUE}→${NC} App:            http://localhost:3000"
echo -e "  ${BLUE}→${NC} API:            http://localhost:8000"
echo -e "  ${BLUE}→${NC} API Docs:       http://localhost:8000/docs"
echo -e "  ${BLUE}→${NC} Supabase Studio: http://127.0.0.1:54323"
echo ""
echo "To view logs:"
echo "  Backend:  tail -f $PROJECT_DIR/logs/backend.log"
echo "  Frontend: tail -f $PROJECT_DIR/logs/frontend.log"
echo ""
echo "To stop services:"
echo "  ./scripts/stop.sh"
echo ""
