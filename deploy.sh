#!/bin/bash
set -e

# =============================================================================
# Der Die Das — Deployment Script
# =============================================================================
#
# PREREQUISITES (one-time setup):
#
# 1. Install CLI tools:
#    - Firebase CLI:  npm install -g firebase-tools
#    - Google Cloud:  https://cloud.google.com/sdk/docs/install
#
# 2. Create a Firebase project:
#    firebase login
#    firebase projects:create <your-project-id> --display-name "Der Die Das"
#
# 3. Update .firebaserc with your project ID:
#    { "projects": { "default": "<your-project-id>" } }
#
# 4. Enable billing on the Google Cloud project:
#    https://console.cloud.google.com/billing
#    (Cloud Run free tier: 2M requests/month — should be free for small usage)
#
# 5. Set the gcloud project:
#    gcloud config set project <your-project-id>
#
# 6. Enable required APIs:
#    gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
#
# 7. Grant service account permissions (if you get 403 errors):
#    PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
#    SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
#
#    gcloud projects add-iam-policy-binding <your-project-id> \
#      --member="serviceAccount:${SA}" --role="roles/storage.admin"
#    gcloud projects add-iam-policy-binding <your-project-id> \
#      --member="serviceAccount:${SA}" --role="roles/logging.logWriter"
#    gcloud projects add-iam-policy-binding <your-project-id> \
#      --member="serviceAccount:${SA}" --role="roles/artifactregistry.admin"
#
# =============================================================================

REGION="europe-west6"
PROJECT_ID="derdiedas-33"
SERVICE_NAME="flash-server"

echo "=== Building client ==="
cd client
npm run build
cd ..

echo "=== Deploying server to Cloud Run ==="
gcloud run deploy $SERVICE_NAME --source=server --region=$REGION --allow-unauthenticated --concurrency=800 --memory=512Mi --max-instances=1 --min-instances=0 --cpu-throttling --set-env-vars="GCLOUD_PROJECT=$PROJECT_ID,CLIENT_ORIGIN=https://$PROJECT_ID.web.app"

echo "=== Deploying client to Firebase Hosting ==="
firebase deploy --only hosting

echo "=== Done! ==="
echo "Site: https://$PROJECT_ID.web.app"