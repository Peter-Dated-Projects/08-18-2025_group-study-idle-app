#!/bin/bash

# Script to run Docker containers with environment variables from .env file
# This keeps sensitive information out of the docker-compose file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Starting Docker containers for Study Garden app...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Find the .env file
ENV_FILE=""
if [ -f "backend/config/.env" ]; then
    ENV_FILE="backend/config/.env"
elif [ -f "config/.env" ]; then
    ENV_FILE="config/.env"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
else
    echo -e "${RED}❌ .env file not found. Please ensure it exists in one of these locations:${NC}"
    echo "  - backend/config/.env"
    echo "  - config/.env" 
    echo "  - .env"
    exit 1
fi

echo -e "${GREEN}✅ Found .env file: ${ENV_FILE}${NC}"

# Export environment variables from .env file
echo -e "${BLUE}📁 Loading environment variables...${NC}"
set -a  # automatically export all variables
source "${ENV_FILE}"
set +a  # stop automatically exporting

# Validate required environment variables
REQUIRED_VARS=(
    "DB_NAME"
    "DB_USER" 
    "DB_PASSWORD"
    "DB_PORT"
    "REDIS_PORT"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo -e "${YELLOW}Please check your .env file and ensure all required variables are set.${NC}"
    exit 1
fi

# Set default values for optional variables
export REDIS_PASSWORD=${REDIS_PASSWORD:-""}

echo -e "${GREEN}✅ Environment variables loaded successfully${NC}"

# Check if docker-compose.env.yml exists
if [ ! -f "docker-compose.env.yml" ]; then
    echo -e "${RED}❌ docker-compose.env.yml not found in current directory${NC}"
    exit 1
fi

# Function to handle cleanup on script exit
cleanup() {
    if [ "$SHOULD_CLEANUP" = "true" ]; then
        echo -e "\n${YELLOW}🛑 Stopping containers...${NC}"
        docker compose -f docker-compose.env.yml down
    fi
}

# Set trap to cleanup on script exit (will only cleanup if SHOULD_CLEANUP is true)
trap cleanup EXIT INT TERM

# By default, don't cleanup when running detached
SHOULD_CLEANUP="false"

# Parse command line arguments
ACTION="up"
SERVICES=""
DETACHED="-d"
FORCE_RECREATE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            echo "Usage: $0 [OPTIONS] [SERVICES...]"
            echo ""
            echo "Options:"
            echo "  -h, --help          Show this help message"
            echo "  --down              Stop and remove containers"
            echo "  --restart           Restart containers"
            echo "  --logs              Show container logs"
            echo "  --no-detach         Run in foreground (don't use -d flag)"
            echo "  --force-recreate    Force recreate containers"
            echo ""
            echo "Services:"
            echo "  studygarden-redis   Redis container only"
            echo "  studygarden-psql    PostgreSQL container only"
            echo "  (no services)       Start all containers"
            echo ""
            echo "Examples:"
            echo "  $0                           # Start all containers in background"
            echo "  $0 --no-detach              # Start all containers in foreground"
            echo "  $0 studygarden-psql         # Start only PostgreSQL"
            echo "  $0 --down                    # Stop all containers"
            echo "  $0 --restart studygarden-redis  # Restart only Redis"
            exit 0
            ;;
        --down)
            ACTION="down"
            DETACHED=""
            shift
            ;;
        --restart)
            ACTION="restart"
            shift
            ;;
        --logs)
            ACTION="logs"
            DETACHED=""
            shift
            ;;
        --no-detach)
            DETACHED=""
            shift
            ;;
        --force-recreate)
            FORCE_RECREATE="--force-recreate"
            shift
            ;;
        studygarden-*)
            SERVICES="$SERVICES $1"
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Execute the requested action
case $ACTION in
    "up")
        echo -e "${BLUE}🚀 Starting containers...${NC}"
        if [ -n "$DETACHED" ]; then
            echo -e "${YELLOW}📋 Running in detached mode. Use 'docker compose -f docker-compose.env.yml logs -f' to see logs${NC}"
            # Don't cleanup when running detached
            SHOULD_CLEANUP="false"
        else
            # Cleanup when running in foreground
            SHOULD_CLEANUP="true"
        fi
        docker compose -f docker-compose.env.yml up $DETACHED $FORCE_RECREATE $SERVICES
        ;;
    "down")
        echo -e "${BLUE}🛑 Stopping containers...${NC}"
        docker compose -f docker-compose.env.yml down $SERVICES
        # Disable cleanup trap since we're manually stopping
        SHOULD_CLEANUP="false"
        trap - EXIT INT TERM
        ;;
    "restart")
        echo -e "${BLUE}🔄 Restarting containers...${NC}"
        docker compose -f docker-compose.env.yml restart $SERVICES
        SHOULD_CLEANUP="false"
        ;;
    "logs")
        echo -e "${BLUE}📋 Showing container logs...${NC}"
        docker compose -f docker-compose.env.yml logs -f $SERVICES
        SHOULD_CLEANUP="true"  # Cleanup after logs since it's interactive
        ;;
esac

if [ "$ACTION" = "up" ] && [ -n "$DETACHED" ]; then
    echo ""
    echo -e "${GREEN}✅ Containers started successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Container Status:${NC}"
    docker compose -f docker-compose.env.yml ps
    echo ""
    echo -e "${BLUE}🔗 Available Services:${NC}"
    echo "  • PostgreSQL: localhost:${DB_PORT}"
    echo "  • Redis: localhost:${REDIS_PORT}"
    echo "  • RedisInsight UI: http://localhost:8001"
    echo ""
    echo -e "${YELLOW}💡 Useful Commands:${NC}"
    echo "  • View logs: docker compose -f docker-compose.env.yml logs -f"
    echo "  • Stop containers: $0 --down"
    echo "  • Restart containers: $0 --restart"
fi
