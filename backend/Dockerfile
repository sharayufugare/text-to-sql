# ── MySQL Backend Dockerfile ─────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps for pymysql (none strictly needed, but good to have curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Use gunicorn in production; flask dev server for local
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "60", "app:app"]
