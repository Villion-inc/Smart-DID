#!/bin/bash
# GCP VM 배포 스크립트
# 사용법: ./deploy-vm.sh [setup|deploy|logs|ssh]

set -e

PROJECT_ID="asanlibrary"
ZONE="asia-northeast3-c"
VM_NAME="asan-library"
REMOTE_DIR="/opt/smart-did"

# VM 인스턴스 이름 확인
echo "=== Smart DID VM Deployment ==="
echo "Project: ${PROJECT_ID}"
echo "VM: ${VM_NAME} (${ZONE})"
echo ""

# SSH 명령 헬퍼
ssh_cmd() {
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="$1"
}

# 1) VM 초기 설정 (최초 1회)
setup_vm() {
    echo ">>> VM 초기 설정 시작..."

    # Docker 설치
    ssh_cmd "
        sudo apt-get update && \
        sudo apt-get install -y ca-certificates curl gnupg && \
        sudo install -m 0755 -d /etc/apt/keyrings && \
        curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
        sudo chmod a+r /etc/apt/keyrings/docker.gpg && \
        echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \$(. /etc/os-release && echo \$VERSION_CODENAME) stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && \
        sudo apt-get update && \
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin && \
        sudo usermod -aG docker \$USER
    "

    # 디렉토리 생성
    ssh_cmd "sudo mkdir -p ${REMOTE_DIR} && sudo chown \$USER:\$USER ${REMOTE_DIR}"

    echo ">>> VM 초기 설정 완료! (Docker 그룹 적용을 위해 재접속 필요)"
}

# 2) 앱 배포
deploy_app() {
    echo ">>> 파일 전송 중..."

    # 필요한 파일만 tar로 묶어서 전송
    tar czf /tmp/smart-did-deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='.next' \
        --exclude='*.log' \
        -C "$(dirname "$0")" .

    gcloud compute scp /tmp/smart-did-deploy.tar.gz \
        ${VM_NAME}:${REMOTE_DIR}/deploy.tar.gz \
        --zone=${ZONE} --project=${PROJECT_ID}

    # .env 파일 전송 (있는 경우)
    if [ -f "$(dirname "$0")/.env" ]; then
        gcloud compute scp "$(dirname "$0")/.env" \
            ${VM_NAME}:${REMOTE_DIR}/.env \
            --zone=${ZONE} --project=${PROJECT_ID}
    fi

    echo ">>> VM에서 빌드 및 실행..."
    ssh_cmd "
        cd ${REMOTE_DIR} && \
        tar xzf deploy.tar.gz && \
        rm deploy.tar.gz && \
        docker compose down --remove-orphans 2>/dev/null || true && \
        docker compose up -d --build
    "

    echo ""
    echo ">>> 배포 완료!"
    echo ">>> 접속: http://$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='value(networkInterfaces[0].accessConfigs[0].natIP)')"
}

# 3) 로그 확인
show_logs() {
    ssh_cmd "cd ${REMOTE_DIR} && docker compose logs -f --tail=50"
}

# 4) SSH 접속
connect_ssh() {
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID}
}

case "$1" in
    setup)
        setup_vm
        ;;
    deploy)
        deploy_app
        ;;
    logs)
        show_logs
        ;;
    ssh)
        connect_ssh
        ;;
    *)
        echo "사용법: $0 [setup|deploy|logs|ssh]"
        echo ""
        echo "  setup   - VM 초기 설정 (Docker 설치, 최초 1회)"
        echo "  deploy  - 앱 빌드 및 배포"
        echo "  logs    - 컨테이너 로그 확인"
        echo "  ssh     - VM SSH 접속"
        echo ""
        echo "배포 순서:"
        echo "  1. .env 파일 생성 (아래 템플릿 참고)"
        echo "  2. ./deploy-vm.sh setup  (최초 1회)"
        echo "  3. ./deploy-vm.sh deploy"
        echo ""
        echo "필요한 .env 파일 예시:"
        echo "  DATABASE_URL=file:./prod.db"
        echo "  JWT_SECRET=your-jwt-secret"
        echo "  INTERNAL_API_SECRET=your-internal-secret"
        echo "  GEMINI_API_KEY=your-gemini-key"
        echo "  ALPAS_USE_MOCK=false"
        echo "  ALPAS_API_URL=https://alpas-api-url"
        echo "  ALPAS_API_KEY=your-alpas-key"
        echo "  ADMIN_USERNAME=admin"
        echo "  ADMIN_PASSWORD=your-password"
        exit 1
        ;;
esac
