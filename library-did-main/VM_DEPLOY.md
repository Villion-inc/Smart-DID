# GCP VM 배포 가이드

## VM 정보
- 이름: asan-library
- 외부 IP: 34.22.107.18
- OS: Debian 12 (Bookworm)
- 리전: asia-northeast3-c

---

## Step 1: Docker 설치 (최초 1회)

```
sudo rm -f /etc/apt/sources.list.d/docker.list
```

```
sudo apt-get update
```

```
sudo apt-get install -y ca-certificates curl gnupg
```

```
sudo install -m 0755 -d /etc/apt/keyrings
```

```
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

```
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

```
sudo sh -c 'echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list'
```

```
sudo apt-get update
```

```
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

```
sudo usermod -aG docker $USER
```

```
newgrp docker
```

---

## Step 2: 코드 가져오기

```
sudo mkdir -p /opt/smart-did
```

```
sudo chown $USER:$USER /opt/smart-did
```

```
cd /opt/smart-did
```

```
git clone https://github.com/Villion-inc/Smart-DID.git .
```

> Private 리포인 경우 GitHub 유저네임 + Personal Access Token 입력

---

## Step 3: .env 파일 생성

```
cat > /opt/smart-did/.env << 'EOF'
NODE_ENV=production
PORT=3001
API_PREFIX=/api
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:gentatestuser123*A@34.47.84.34:5432/smart-did
JWT_SECRET=EKqk5qtI2xOAerJsYdxfLOXcQpnXgjkuhy+oYF+hIRs=
JWT_EXPIRES_IN=3600
INTERNAL_API_SECRET=VSMXmsPDC0RR5z5DT32Otl4v64Xr6WXHH24UAktupfU=
REDIS_HOST=redis
REDIS_PORT=6379
STORAGE_TYPE=gcs
STORAGE_PATH=./storage/videos
GCS_BUCKET=smart-did-storage-1
GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/smart-did-storage-1
ALPAS_USE_MOCK=false
ALPAS_API_URL=http://10.10.11.13:28180/METIS/HOMEPAGE/API
ALPAS_API_KEY=
ALPAS_LIB_NO=144045
ALPAS_MANAGE_CODE=CH
ALPAS_NETWORK_ADAPTER_ID=DE6E94C866F74ED00E783FA9EBCB8C6FEB860D567EB1AD25DF1964D5037029ED
NAVER_CLIENT_ID=xLfYHST49wkb7cWVjKPW
NAVER_CLIENT_SECRET=cbfL2TkYqu
VITE_API_URL=/api
ADMIN_USERNAME=admin
ADMIN_PASSWORD=@admin1234@
EOF
```

---

## Step 4: 빌드 및 실행

```
cd /opt/smart-did
```

```
docker compose up -d --build
```

---


## 유용한 명령어

로그 확인:
```
cd /opt/smart-did && docker compose logs -f
```

특정 서비스 로그:
```
docker compose logs -f backend
```

```
docker compose logs -f worker
```

```
docker compose logs -f frontend
```

재시작:
```
cd /opt/smart-did && docker compose restart
```

중지:
```
cd /opt/smart-did && docker compose down
```

코드 업데이트 후 재배포:
```
cd /opt/smart-did && git pull && docker compose up -d --build
```

---

## 보안 참고

- SSH 접속: GCP IAP(Identity-Aware Proxy) 통해서만 가능 (GCP Console SSH 버튼 또는 gcloud compute ssh)
- 외부에서 열린 포트: 80(HTTP), 443(HTTPS)만 허용
- Redis: 외부 노출 안 됨 (컨테이너 내부 통신만)
- Cloud SQL: 34.22.107.18 IP만 승인된 네트워크에 추가 필요
