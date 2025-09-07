#!/bin/bash

# FastAPI backend startup script
# For development use: uvicorn
# For production use: gunicorn with uvicorn workers

PORT=${PORT:-8080}
WORKERS=${WORKERS:-2}

echo "Starting FastAPI backend on port $PORT with $WORKERS workers"

# Development mode (if DEBUG is true)
if [ "$DEBUG" = "true" ]; then
    echo "Running in development mode with auto-reload"
    uvicorn main:app --host 0.0.0.0 --port $PORT --reload
else
    echo "Running in production mode"
    gunicorn main:app -w $WORKERS -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
fi