# Single deploy entry for Google Cloud Run.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Run as non-root.
RUN useradd --create-home --uid 1000 appuser

# Create writable log directory for the non-root user.
RUN mkdir -p /app/logs && chown appuser:appuser /app/logs

USER appuser

# Cloud Run injects $PORT (defaults to 8080). uvicorn serves the async app.
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
