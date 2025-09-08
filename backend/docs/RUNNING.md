# Running the Backend Server

After reorganizing the backend folder structure, here are the recommended ways to run the development server:

## Method 1: Using the Run Script (Recommended)

From the `backend` directory:

```bash
# Activate virtual environment
source .venv/bin/activate  # or `source .venv/Scripts/activate` on Windows

# Run the development server
python run_server.py
```

This will start the server on `http://localhost:8000` with auto-reload enabled.

## Method 2: Using Uvicorn Directly

From the `backend` directory:

```bash
# Activate virtual environment
source .venv/bin/activate

# Run with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Method 3: Using Python Module

From the `backend` directory:

```bash
# Activate virtual environment
source .venv/bin/activate

# Run as Python module
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## ⚠️ Important Notes

- **Always run from the `backend` directory**, not from `backend/app/`
- The reorganized structure uses relative imports that require the proper Python module path
- Running `python app/main.py` directly from the `backend` directory will cause import errors
- Use the methods above for proper module resolution

## Environment Variables

Environment variables are loaded from `backend/config/.env`. The following variables are available:

- `PORT`: Server port (default: 8080)
- `DEBUG`: Enable debug mode (default: true)
- `HOST`: Server host (default: 0.0.0.0)
- `LOG_LEVEL`: Logging level (default: info)
- `CORS_ORIGINS`: Comma-separated list of allowed origins (default: "\*")
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis password (if required)
- `REDIS_DB`: Redis database number (default: 0)

Both `run_server.py` and `app/main.py` automatically load the configuration from `backend/config/.env`.

## Redis Dependency

Make sure Redis is running before starting the backend server. The application uses Redis for lobby storage and WebSocket management.
