#!/bin/bash
# GCP Cloud Run 배포 스크립트
# 사용법: ./deploy-gcp.sh [backend|frontend|worker|all]

set -e

PROJECT_ID="asanlibrary"
REGION="asia-northeast3"
# Cloud SQL 연결 이름 (GCP 콘솔에서 확인)
CLOUD_SQL_CONNECTION="asanlibrary:asia-northeast3:smart-did-db"

# Artifact Registry 설정
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/smart-did"

# 서비스별 이미지 이름
BACKEND_IMAGE="${REGISTRY}/backend:latest"
FRONTEND_IMAGE="${REGISTRY}/frontend:latest"
WORKER_IMAGE="${REGISTRY}/worker:latest"

# Cloud Run 서비스 이름
BACKEND_SERVICE="smart-did-backend"
FRONTEND_SERVICE="smart-did-frontend"
WORKER_SERVICE="smart-did-worker"

echo "=== Smart DID GCP Deployment ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

deploy_backend() {
    echo ">>> Building Backend..."
    docker build -f Dockerfile.backend -t ${BACKEND_IMAGE} .
    
    echo ">>> Pushing Backend to Artifact Registry..."
    docker push ${BACKEND_IMAGE}
    
    echo ">>> Deploying Backend to Cloud Run..."
    gcloud run deploy ${BACKEND_SERVICE} \
        --image ${BACKEND_IMAGE} \
        --region ${REGION} \
        --platform managed \
        --allow-unauthenticated \
        --add-cloudsql-instances ${CLOUD_SQL_CONNECTION} \
        --set-env-vars "NODE_ENV=production" \
        --set-env-vars "PORT=3000" \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 3
    
    echo ">>> Backend deployed!"
}

deploy_frontend() {
    echo ">>> Building Frontend..."
    # Backend URL은 Cloud Run 배포 후 얻은 URL로 설정
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region ${REGION} --format='value(status.url)' 2>/dev/null || echo "")
    
    docker build -f Dockerfile.frontend \
        --build-arg VITE_API_URL="${BACKEND_URL}/api" \
        -t ${FRONTEND_IMAGE} .
    
    echo ">>> Pushing Frontend to Artifact Registry..."
    docker push ${FRONTEND_IMAGE}
    
    echo ">>> Deploying Frontend to Cloud Run..."
    gcloud run deploy ${FRONTEND_SERVICE} \
        --image ${FRONTEND_IMAGE} \
        --region ${REGION} \
        --platform managed \
        --allow-unauthenticated \
        --memory 256Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 3
    
    echo ">>> Frontend deployed!"
}

deploy_worker() {
    echo ">>> Building Worker..."
    docker build -f Dockerfile.worker -t ${WORKER_IMAGE} .
    
    echo ">>> Pushing Worker to Artifact Registry..."
    docker push ${WORKER_IMAGE}
    
    echo ">>> Deploying Worker to Cloud Run..."
    # Worker는 항상 실행되어야 하므로 min-instances=1
    # CPU always allocated for background processing
    gcloud run deploy ${WORKER_SERVICE} \
        --image ${WORKER_IMAGE} \
        --region ${REGION} \
        --platform managed \
        --no-allow-unauthenticated \
        --add-cloudsql-instances ${CLOUD_SQL_CONNECTION} \
        --set-env-vars "NODE_ENV=production" \
        --memory 2Gi \
        --cpu 2 \
        --min-instances 1 \
        --max-instances 2 \
        --cpu-boost \
        --no-cpu-throttling
    
    echo ">>> Worker deployed!"
}

case "$1" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    worker)
        deploy_worker
        ;;
    all)
        deploy_backend
        deploy_frontend
        deploy_worker
        ;;
    *)
        echo "Usage: $0 [backend|frontend|worker|all]"
        echo ""
        echo "Before running, ensure:"
        echo "1. gcloud is authenticated: gcloud auth login"
        echo "2. Docker is configured: gcloud auth configure-docker ${REGION}-docker.pkg.dev"
        echo "3. Update CLOUD_SQL_CONNECTION in this script"
        echo "4. Set environment variables in GCP Console for each service"
        exit 1
        ;;
esac

echo ""
echo "=== Deployment Complete ==="
