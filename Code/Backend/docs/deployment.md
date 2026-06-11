# Mini-Map Backend — Deployment Guide

Step-by-step guide to deploy the backend to Google Cloud Run.

---

## Architecture Overview

- **Runtime**: Python 3.11 FastAPI on Google Cloud Run
- **Database**: MongoDB Atlas (free M0 tier)
- **AI**: Google Vertex AI / Gemini
- **External APIs**: Voyage AI, OpenWeather, Google Places, Fixer.io

The backend is a single-gateway modular monolith. One endpoint (`POST /api/gateway`)
routes requests by the `X-Operation-Type` header to internal services via an
in-process RPC registry.

---

## Prerequisites

| Tool | Install |
|------|---------|
| Docker | `brew install docker` or [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| gcloud CLI | `brew install google-cloud-sdk` |
| Git | Pre-installed on macOS |

---

## Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click the project dropdown (top-left) → **New Project**
3. Name it `minimap` and create it
4. Select the new project from the dropdown

## Step 2: Enable Billing

1. Go to https://console.cloud.google.com/billing
2. Add a payment method
3. Link the billing account to your `minimap` project

New accounts get **$300 free credit** for 90 days.

## Step 3: Enable Required APIs

```bash
gcloud services enable run.googleapis.com \
    cloudbuild.googleapis.com \
    aiplatform.googleapis.com
```

Or enable manually:
- Cloud Run API: https://console.cloud.google.com/apis/library/run.googleapis.com
- Cloud Build API: https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com
- Vertex AI API: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com

## Step 4: Set Up MongoDB Atlas (Free M0)

1. Sign up at https://cloud.mongodb.com
2. Create a new cluster → select **M0** (free, 512 MB)
3. Pick cloud provider/region (use `us-central1` to be near Cloud Run)
4. Wait for cluster creation (~2 minutes)

**Create a database user:**

1. Sidebar → **Database Access** → **Add New Database User**
2. Username: `minimap`
3. Password: generate one and **copy it** (you'll need it)
4. Privileges: **Read and write to any database**

**Allow network access:**

1. Sidebar → **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (or add `0.0.0.0/0`)

**Get connection string:**

1. Click **Connect** → **Drivers**
2. Copy the connection string:

```
mongodb+srv://minimap:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with the password you generated.

## Step 5: Get External API Keys

| Service | Signup URL | Purpose |
|---------|-----------|---------|
| Voyage AI | https://www.voyageai.com | Text embeddings |
| OpenWeather | https://openweathermap.org/api | Weather data |
| Google Places | https://console.cloud.google.com/apis/library/places-backend.googleapis.com | Place/POI data |
| Fixer.io | https://fixer.io | Currency exchange rates |

Sign up for free tiers where available.

## Step 6: Install & Authenticate gcloud

```bash
# Install
brew install google-cloud-sdk

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project <YOUR_PROJECT_ID>

# Application credentials (for Vertex AI)
gcloud auth application-default login
```

Verify:

```bash
gcloud config get-value project
# → should print your project ID
```

## Step 7: Create the .env File

```bash
cd Code/Backend
cp .env.example .env
```

Open `.env` and fill in real values. Remove ALL inline comments (values with
trailing `# ...` comments break pydantic-settings).

Example:

```env
APP_ENV=production
LOG_LEVEL=INFO

# Google Cloud / Vertex AI
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=
GEMINI_MODEL=gemini-2.5-flash

# MongoDB Atlas
MONGODB_URI=mongodb+srv://minimap:<password>@<cluster>.mongodb.net
MONGODB_DB=minimap

# External APIs
VOYAGE_API_KEY=<voyage-key>
OPENWEATHER_API_KEY=<openweather-key>
GOOGLE_PLACES_API_KEY=<places-key>
FX_API_KEY=<fixer-key>

# Gateway auth (generate with: openssl rand -hex 32)
GATEWAY_API_KEY=<your-random-secret>
```

## Step 8: Test Locally with Docker

```bash
cd Code/Backend

# Build the image
docker build -t minimap-backend .

# Run the container
docker run -p 8080:8080 --env-file .env minimap-backend
```

In another terminal, verify:

```bash
# Health check
curl http://localhost:8080/healthz

# Gateway smoke test
curl -s -X POST http://localhost:8080/api/gateway \
  -H "X-Operation-Type: HEALTH_PING" \
  -H "X-Api-Key: <your-gateway-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:

```json
{"ok": true, "operation": "HEALTH_PING", "data": {...}, "error": null}
```

Press `Ctrl+C` to stop the container when done.

## Step 9: Build & Push to Google Container Registry

```bash
cd Code/Backend

PROJECT=$(gcloud config get-value project)

gcloud builds submit --tag gcr.io/$PROJECT/minimap-backend-v2
```

Wait for the build to complete (first time takes a few minutes).

Verify the image:

```bash
gcloud container images list --repository=gcr.io/$PROJECT
```

## Step 10: Deploy to Cloud Run

```bash
PROJECT=$(gcloud config get-value project)

gcloud run deploy minimap-backend-v2 \
  --image gcr.io/$PROJECT/minimap-backend-v2 \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "$(grep -v '^#' .env | grep -v '^$' | xargs | tr ' ' ',')"
```

After deployment, the CLI prints your service URL:

```
Service URL: https://minimap-backend-v2-xxxxx-uc.a.run.app
```

## Step 11: Verify the Deployed Service

```bash
SERVICE_URL=$(gcloud run services describe minimap-backend-v2 \
  --region us-central1 \
  --format='value(status.url)')

# Health check
curl $SERVICE_URL/healthz

# Gateway test
curl -s -X POST $SERVICE_URL/api/gateway \
  -H "X-Operation-Type: HEALTH_PING" \
  -H "X-Api-Key: <your-gateway-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Both should return HTTP 200.

## Step 12: Connect the Frontend

1. Set the API base URL to the Cloud Run service URL from Step 10
2. Add `X-Api-Key` header with your `GATEWAY_API_KEY` on every request
3. Add `X-Operation-Type` header matching the operation you want

---

## Troubleshooting

### Container exits with `ValueError: Unknown level`

Your `.env` file has inline comments. pydantic-settings does not strip them.
Remove all `# ...` trailing comments from the `.env` file. Keep comments only
on their own lines.

### Container exits with `Permission denied: '/app/logs'`

Rebuild the Docker image. The Dockerfile has been updated to create `/app/logs`
with correct ownership for the non-root user.

### Cloud Build fails with "no project" / "not authenticated"

```bash
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>
```

### Vertex AI returns 403 / not authorized

```bash
gcloud auth application-default login
```

Also verify the Vertex AI API is enabled (Step 3).

---

## Useful Commands

```bash
# View service logs
gcloud run services logs read minimap-backend-v2 --region us-central1

# Tail logs in real-time
gcloud run services logs tail minimap-backend-v2 --region us-central1

# Update environment variables
gcloud run services update minimap-backend-v2 --region us-central1 \
  --set-env-vars KEY1=val1,KEY2=val2

# Deploy a new version
gcloud builds submit --tag gcr.io/$PROJECT/minimap-backend-v2
gcloud run deploy minimap-backend-v2 \
  --image gcr.io/$PROJECT/minimap-backend-v2 \
  --region us-central1

# Delete the service (stops all charges)
gcloud run services delete minimap-backend-v2 --region us-central1

# View deployed revision
gcloud run revisions list --region us-central1
```

---

## Monthly Cost Estimate (Low Traffic)

| Resource | Cost |
|----------|------|
| Cloud Run hosting | $0 (free tier: 2M requests, 360K GB-seconds) |
| MongoDB Atlas M0 | $0 (512 MB) |
| Vertex AI Gemini | ~$0.50–$5 (token-based, no free tier after $300 credit) |
| External APIs | Depends on free tiers of each service |
| **Total** | **~$0–$5/month** |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ENV` | Yes | `local`, `staging`, or `production` |
| `LOG_LEVEL` | Yes | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `GOOGLE_CLOUD_PROJECT` | Yes | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | Yes | GCP region (e.g. `us-central1`) |
| `GEMINI_MODEL` | Yes | Gemini model alias (e.g. `gemini-2.5-flash`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB` | Yes | Database name (default `minimap`) |
| `GATEWAY_API_KEY` | Production | Shared secret for API authentication |
| `VOYAGE_API_KEY` | Production | Voyage AI embeddings API |
| `OPENWEATHER_API_KEY` | Production | OpenWeather API |
| `GOOGLE_PLACES_API_KEY` | Production | Google Places API |
| `FX_API_KEY` | Production | Fixer.io currency API |
