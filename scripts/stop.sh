#!/bin/bash

# Chat Document - Stop Script
# This script stops Supabase, backend, and frontend servers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Chat Document - Stopping Services"
echo "=========================================="
echo ""

PID_DIR="$PROJECT_DIR/.pids"

# Stop Backend
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "Stopping Backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
        sleep 1
        # Force kill if still running
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill -9 $BACKEND_PID 2>/dev/null
        fi
        echo -e "${GREEN}✓${NC} Backend stopped"
    else
        echo -e "${YELLOW}Backend was not running${NC}"
    fi
    rm "$PID_DIR/backend.pid"
else
    echo -e "${YELLOW}No backend PID file found${NC}"
fi

# Stop Frontend
if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
        sleep 1
        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill -9 $FRONTEND_PID 2>/dev/null
        fi
        echo -e "${GREEN}✓${NC} Frontend stopped"
    else
        echo -e "${YELLOW}Frontend was not running${NC}"
    fi
    rm "$PID_DIR/frontend.pid"
else
    echo -e "${YELLOW}No frontend PID file found${NC}"
fi

# Kill any lingering processes on the ports
echo ""
echo "Checking for lingering processes..."

# Kill any process on port 8000
BACKEND_PORT_PID=$(lsof -ti:8000 2>/dev/null || true)
if [ -n "$BACKEND_PORT_PID" ]; then
    echo "Killing process on port 8000 (PID: $BACKEND_PORT_PID)..."
    kill -9 $BACKEND_PORT_PID 2>/dev/null || true
fi

# Kill any process on port 3000
FRONTEND_PORT_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$FRONTEND_PORT_PID" ]; then
    echo "Killing process on port 3000 (PID: $FRONTEND_PORT_PID)..."
    kill -9 $FRONTEND_PORT_PID 2>/dev/null || true
fi

# Stop Supabase
echo ""
echo "Stopping Supabase..."
cd "$PROJECT_DIR"
if supabase status > /dev/null 2>&1; then
    supabase stop
    echo -e "${GREEN}✓${NC} Supabase stopped"
else
    echo -e "${YELLOW}Supabase was not running${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  All Services Stopped${NC}"
echo "=========================================="
echo ""
