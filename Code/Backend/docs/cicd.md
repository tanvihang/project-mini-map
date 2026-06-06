# CI/CD — Continuous Deployment Guide

## Quick: Deploying Backend Updates

Every time code is pushed, redeploy in two commands:

```bash
cd Code/Backend

# 1. Build new Docker image
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# 2. Deploy to Cloud Run (traffic auto-routes to new revision)
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --region $REGION
```

Run both commands. The new revision takes over automatically.

---

## Automated: Deploy on Git Push

Set this up once so every `git push` to `main` rebuilds and deploys automatically.

### Step 1: Connect GitHub

1. Go to https://console.cloud.google.com/cloud-build/repos
2. Click **Connect Repository**
3. Select **GitHub**, authenticate, and choose your repo
4. Click **Connect**

### Step 2: Create Trigger

1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Click **Create Trigger**
3. Fill in:
   - **Name**: `deploy-on-push-to-main`
   - **Event**: Push to a branch
   - **Repository**: your connected repo
   - **Branch**: `^main$` (or `^backend/.*$` for backend branches)
   - **Configuration**: Cloud Build configuration file (yaml or json)
   - **Location**: Repository → path: `Code/Backend/cloudbuild.yaml`

### Step 3: Add `cloudbuild.yaml`

Create this file at `Code/Backend/cloudbuild.yaml` and push it:

```yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - gcr.io/$PROJECT_ID/$SERVICE_NAME
      - .

images:
  - gcr.io/$PROJECT_ID/$SERVICE_NAME

options:
  logging: CLOUD_LOGGING_ONLY
```

Then the trigger will auto-deploy the image to Cloud Run once the build completes. To make it fully hands-off, add a deploy step:

```yaml
steps:
  # Step 1: Build the Docker image
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - gcr.io/$PROJECT_ID/$SERVICE_NAME
      - .

  # Step 2: Push to Container Registry
  - name: gcr.io/cloud-builders/docker
    args:
      - push
      - gcr.io/$PROJECT_ID/$SERVICE_NAME

  # Step 3: Deploy to Cloud Run
  - name: gcr.io/google.com/cloudsdktool/google-cloud-cli
    entrypoint: gcloud
    args:
      - run
      - deploy
      - $SERVICE_NAME
      - --image=gcr.io/$PROJECT_ID/$SERVICE_NAME
      - --region=$REGION
      - --platform=managed
      - --allow-unauthenticated
      - --set-env-vars=${_ENV_VARS}

images:
  - gcr.io/$PROJECT_ID/$SERVICE_NAME

options:
  logging: CLOUD_LOGGING_ONLY

```

Push this file and the trigger is live — from then on:

```
git push → Cloud Build → Cloud Run → live at $SERVICE_NAME-XXXXX-XX.a.run.app
```

---

## Rollback

If a deploy breaks something, revert in the dashboard:

1. Go to https://console.cloud.google.com/run → **$SERVICE_NAME**
2. Tab **Revisions**
3. Find the last working revision, click ⋮ → **Manage Traffic** → set to 100%

Or via CLI:


```bash
gcloud run services update-traffic $SERVICE_NAME \
  --region $REGION \
  --to-revisions <REVISION_NAME>=100
```

---

## Cost

Cloud Build gives 120 free build-minutes per day (n2-standard-1). More than enough for a team pushing frequently.
