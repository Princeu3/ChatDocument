#!/bin/bash

# Chat Document - Setup Script
# This script sets up both the backend and frontend environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  Chat Document - Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker installed"

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC}"
    echo "Install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}✓${NC} Bun $(bun --version)"

# Check for UV
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: UV is not installed.${NC}"
    echo "Install UV: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} UV $(uv --version)"

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Install: brew install supabase/tap/supabase"
    exit 1
fi
echo -e "${GREEN}✓${NC} Supabase CLI $(supabase --version)"

echo ""
echo "Setting up Backend..."
echo "--------------------------------------------"

cd "$PROJECT_DIR/backend"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit backend/.env to add your GOOGLE_API_KEY${NC}"
    echo "   Get your key from: https://aistudio.google.com/apikey"
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Install Python dependencies
echo "Installing Python dependencies..."
uv sync
echo -e "${GREEN}✓${NC} Backend dependencies installed"

echo ""
echo "Setting up Frontend..."
echo "--------------------------------------------"

cd "$PROJECT_DIR/frontend"

# Install Node dependencies
echo "Installing Node dependencies..."
bun install
echo -e "${GREEN}✓${NC} Frontend dependencies installed"

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}Add your Google API Key${NC} to backend/.env:"
echo "   GOOGLE_API_KEY=your_key_here"
echo "   (Get from: https://aistudio.google.com/apikey)"
echo ""
echo "2. ${YELLOW}Start Docker Desktop${NC} (required for Supabase)"
echo ""
echo "3. ${YELLOW}Start the application:${NC}"
echo "   ./scripts/start.sh"
echo ""
echo "This will automatically:"
echo "  - Start Supabase local (database + storage)"
echo "  - Run database migrations"
echo "  - Start the backend API"
echo "  - Start the frontend"
echo ""
