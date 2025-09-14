#!/bin/bash

# Clear Redis Cache Script
# This script clears all Redis cache data for the group study idle app

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if virtual environment exists and activate it
activate_venv() {
    if [ -d "$PROJECT_ROOT/.venv" ]; then
        print_status "Activating virtual environment..."
        source "$PROJECT_ROOT/.venv/bin/activate"
        print_success "Virtual environment activated"
        return 0
    else
        print_error "Virtual environment not found at $PROJECT_ROOT/.venv"
        print_error "Please create a virtual environment first:"
        print_error "  cd $PROJECT_ROOT && python3 -m venv .venv"
        return 1
    fi
}

# Function to clear Redis cache using Python script
clear_redis_python() {
    print_status "Clearing Redis cache using Python..."
    
    cd "$SCRIPT_DIR"
    
    python3 -c "
import sys
sys.path.append('.')

try:
    from app.utils.redis_utils import RedisClient
    
    redis_client = RedisClient()
    
    # Test connection first
    if not redis_client.ping():
        print('ERROR: Cannot connect to Redis server')
        sys.exit(1)
    
    # Get current key count
    all_keys = redis_client.client.keys('*')
    key_count = len(all_keys)
    
    if key_count == 0:
        print('Redis cache is already empty (0 keys)')
    else:
        print(f'Found {key_count} keys in Redis cache')
        
        # Show some example keys (max 5)
        if key_count > 0:
            print('Example keys:')
            for i, key in enumerate(all_keys[:5]):
                print(f'  - {key}')
            if key_count > 5:
                print(f'  ... and {key_count - 5} more')
        
        # Clear the cache
        redis_client.client.flushdb()
        
        # Verify it's cleared
        new_key_count = len(redis_client.client.keys('*'))
        print(f'Redis cache cleared! Keys: {key_count} -> {new_key_count}')
    
except ImportError as e:
    print(f'ERROR: Cannot import Redis utilities: {e}')
    print('Make sure you are in the backend directory and virtual environment is active')
    sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
"
}

# Function to clear Redis cache using redis-cli (fallback)
clear_redis_cli() {
    print_status "Attempting to clear Redis using redis-cli..."
    
    # Check if redis-cli is available
    if ! command -v redis-cli &> /dev/null; then
        print_error "redis-cli command not found"
        return 1
    fi
    
    # Try to connect and clear
    if redis-cli ping > /dev/null 2>&1; then
        print_status "Connected to Redis via redis-cli"
        
        # Get key count before clearing
        key_count=$(redis-cli DBSIZE 2>/dev/null || echo "unknown")
        print_status "Current keys in database: $key_count"
        
        # Clear the database
        redis-cli FLUSHDB > /dev/null 2>&1
        
        # Verify
        new_key_count=$(redis-cli DBSIZE 2>/dev/null || echo "unknown")
        print_success "Redis cache cleared using redis-cli! Keys: $key_count -> $new_key_count"
        return 0
    else
        print_error "Cannot connect to Redis via redis-cli"
        return 1
    fi
}

# Function to show cache statistics
show_cache_stats() {
    print_status "Fetching cache statistics..."
    
    # Try to get stats via API endpoint
    if command -v curl &> /dev/null; then
        cache_stats=$(curl -s "http://localhost:8000/api/username-resolution/cache-stats" 2>/dev/null)
        if [ $? -eq 0 ] && echo "$cache_stats" | grep -q "success"; then
            print_success "Username resolution cache stats:"
            echo "$cache_stats" | python3 -m json.tool 2>/dev/null || echo "$cache_stats"
        else
            print_warning "Could not fetch cache stats from API (server may not be running)"
        fi
    fi
}

# Main script logic
main() {
    echo "================================================================"
    echo "           Redis Cache Clear Script"
    echo "           Group Study Idle App Backend"
    echo "================================================================"
    echo
    
    # Show current directory
    print_status "Script location: $SCRIPT_DIR"
    print_status "Project root: $PROJECT_ROOT"
    echo
    
    # Activate virtual environment
    if ! activate_venv; then
        exit 1
    fi
    
    echo
    print_status "Starting Redis cache clear process..."
    echo
    
    # Try Python method first (preferred)
    if clear_redis_python; then
        print_success "Successfully cleared Redis cache using Python method"
    else
        print_warning "Python method failed, trying redis-cli fallback..."
        if clear_redis_cli; then
            print_success "Successfully cleared Redis cache using redis-cli"
        else
            print_error "Failed to clear Redis cache with both methods"
            print_error "Please check:"
            print_error "  1. Redis server is running"
            print_error "  2. Virtual environment is set up correctly"
            print_error "  3. Redis connection settings in .env file"
            exit 1
        fi
    fi
    
    echo
    show_cache_stats
    
    echo
    print_success "Redis cache clear operation completed!"
    echo "================================================================"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Clear Redis cache for the group study idle app backend"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --stats-only   Only show cache statistics without clearing"
        echo
        echo "Examples:"
        echo "  $0                 # Clear Redis cache"
        echo "  $0 --stats-only    # Show cache stats only"
        exit 0
        ;;
    --stats-only)
        activate_venv || exit 1
        show_cache_stats
        exit 0
        ;;
    "")
        # Default: run main function
        main
        ;;
    *)
        print_error "Unknown option: $1"
        print_error "Use --help for usage information"
        exit 1
        ;;
esac
