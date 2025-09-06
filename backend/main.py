import os
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS


def create_app() -> Flask:
    app = Flask(__name__)

    # CORS: configure via env in local/prod. Comma-separated origins, default to '*'.
    cors_origins = os.getenv("CORS_ORIGINS", "*")
    CORS(app, origins=[o.strip() for o in cors_origins.split(",") if o.strip()], supports_credentials=True)

    @app.get("/healthz")
    def healthz():
        """Liveness probe."""
        return {"ok": True, "ts": datetime.utcnow().isoformat()}

    @app.get("/ready")
    def ready():
        """Readiness probe. Return 200 when ready to accept traffic."""
        # Add real checks here (e.g., DB ping) if needed.
        return {"ready": True}

    @app.get("/api/hello")
    def hello():
        name = request.args.get("name", "world")
        return jsonify(message=f"Hello, {name}!")

    return app


# Export `app` for production servers (gunicorn) and Cloud Run
app = create_app()


if __name__ == "__main__":
    # Local dev entrypoint: `python backend/main.py`
    port = int(os.environ.get("PORT", "8080"))  # Cloud Run also sets PORT
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
