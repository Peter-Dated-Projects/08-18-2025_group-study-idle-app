# 🌱 StudyGarden Backend (API)

This is the backend service for **StudyGarden**, a gamified productivity app where completing real-life tasks helps you grow a virtual garden.

The backend is built with **Flask** and runs on **Google Cloud Run**. It provides REST APIs (and later WebSocket streaming) to handle tasks, rewards, and garden state.

---

## 🚀 Features

- Task management endpoints (add, complete, list)
- Reward system: completing tasks grants coins/seeds
- Garden API: plant, grow, harvest
- Health check endpoint (`/healthz`)
- CORS-enabled for frontend (Next.js)

---

## 🛠 Tech Stack

- **Python 3.11** + **Flask**
- **Gunicorn** (production WSGI server)
- **Google Cloud Run** for hosting
- (Optional) **Firestore** for persistence
- (Optional) **Flask-SocketIO** for realtime multiplayer

---

## 📦 Local Development

```bash
# Create venv
python3 -m venv .venv
source .venv/bin/activate

# Install deps
pip install -r requirements.txt

# Run locally
flask run --host=0.0.0.0 --port=8080
```

## ☁️ Deployment (Cloud Run)

```
gcloud run deploy studygarden-api \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated
```

The service will be available at:

```
https://studygarden-api-<hash>-<region>.a.run.app
```
