# RTLGuard AI — Deployment Guide

This document describes how to deploy the **RTLGuard AI** platform in production using Docker, Docker Compose, or manual WSGI execution.

## 1. Environment Variables Configuration

RTLGuard AI uses environment variables for config. Create a `.env` file in the `backend/` directory or define these variables in your hosting environment:

- `MONGO_URI`: MongoDB Atlas connection string.
- `SECRET_KEY`: Random string for session signature security.
- `PORT`: Port the server runs on (defaults to `5000`).
- `GEMINI_API_KEY`: API key for Google Gemini model access (optional).

---

## 2. Docker Deployment

Containerization is the recommended production deployment method.

### Build and Run locally
Build the docker image:
```bash
docker build -t rtlguard-ai .
```

Run the container:
```bash
docker run -d -p 5000:5000 \
  -e MONGO_URI="your_mongodb_uri" \
  -e SECRET_KEY="your_secret_key" \
  --name rtlguard-container \
  rtlguard-ai
```

### Docker Compose
Run using Docker Compose:
```bash
docker compose up -d --build
```
This automatically builds the image and runs it in detached mode.

---

## 3. Deployment on Render, fly.io, or Heroku

If deploying to cloud hosts like Render or Heroku:

### Option A: Web Service (via Docker)
1. Link your GitHub repository to Render/Heroku.
2. Select **Web Service** or **Docker App** deployment type.
3. Render/Heroku will auto-detect the `Dockerfile` at the root and compile the image.
4. Add the following **Environment Variables** in the platform settings:
   - `MONGO_URI`
   - `SECRET_KEY`
   - `PORT` (usually bound automatically by host)

### Option B: Python Native (without Docker)
If you deploy directly as a Python project (e.g. Render Python web service):
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `python run_production.py` or `gunicorn wsgi:app -b 0.0.0.0:$PORT`

---

## 4. Manual Local Production Run (Waitress/Gunicorn)

To run in production mode on your machine directly without Docker:

1. Install requirements:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Execute the production entrypoint:
   ```bash
   python run_production.py
   ```
   *Note: This automatically uses Gunicorn (Linux/macOS) with multiple workers/threads, or Waitress (Windows) for robust WSGI servicing.*
