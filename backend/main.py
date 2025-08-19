from flask import Flask, jsonify, request
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)  # tighten origins later

@app.get("/healthz")
def healthz():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}

@app.get("/api/hello")
def hello():
    name = request.args.get("name", "world")
    return jsonify(message=f"Hello, {name}!")
