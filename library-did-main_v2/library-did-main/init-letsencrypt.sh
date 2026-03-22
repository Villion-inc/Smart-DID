#!/bin/bash
# Let's Encrypt 초기 인증서 발급 스크립트
# 사용법: ./init-letsencrypt.sh <도메인> <이메일>
# 예시: ./init-letsencrypt.sh library.example.com admin@example.com
# 재실행 가능 (멱등)

set -e

DOMAIN=$1
EMAIL=$2
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ssl.yml"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "사용법: $0 <도메인> <이메일>"
  echo "예시: $0 library.example.com admin@example.com"
  exit 1
fi

echo "=== Let's Encrypt 인증서 발급 ==="
echo "도메인: $DOMAIN"
echo "이메일: $EMAIL"
echo ""

# 1. nginx-ssl.conf 도메인 설정 (멱등: 이전 도메인 또는 PLACEHOLDER 모두 교체)
echo "[1/5] nginx-ssl.conf 도메인 설정..."
# 먼저 DOMAIN_PLACEHOLDER 교체 시도, 없으면 기존 도메인을 찾아서 교체
if grep -q "DOMAIN_PLACEHOLDER" nginx-ssl.conf; then
  sed -i.bak "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx-ssl.conf
else
  # 기존 도메인(ssl_certificate 경로에서 추출)을 새 도메인으로 교체
  OLD_DOMAIN=$(grep -oP '(?<=live/)[^/]+' nginx-ssl.conf | head -1)
  if [ -n "$OLD_DOMAIN" ] && [ "$OLD_DOMAIN" != "$DOMAIN" ]; then
    sed -i.bak "s|$OLD_DOMAIN|$DOMAIN|g" nginx-ssl.conf
  fi
fi
rm -f nginx-ssl.conf.bak

# 2. 임시 self-signed 인증서 생성 (nginx 최초 시작용)
echo "[2/5] 임시 인증서 생성..."
$COMPOSE run --rm --entrypoint "\
  mkdir -p /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'" certbot

# 3. 인증서 권한 수정 (nginx 비root 유저가 읽을 수 있도록)
echo "[3/5] 인증서 권한 설정..."
$COMPOSE run --rm --entrypoint "\
  chmod -R 755 /etc/letsencrypt/live && \
  chmod -R 755 /etc/letsencrypt/archive" certbot 2>/dev/null || true

# 4. nginx 시작 (임시 인증서로)
echo "[4/5] nginx 시작..."
$COMPOSE up -d frontend

# 5. 실제 인증서 발급
echo "[5/5] Let's Encrypt 인증서 발급..."
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    --domain $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

# 실제 인증서 권한도 수정
$COMPOSE run --rm --entrypoint "\
  chmod -R 755 /etc/letsencrypt/live && \
  chmod -R 755 /etc/letsencrypt/archive" certbot

# nginx 재시작 (실제 인증서 적용)
echo ""
echo "=== nginx 재시작 ==="
$COMPOSE restart frontend

echo ""
echo "=== 완료 ==="
echo "HTTPS가 활성화되었습니다: https://$DOMAIN"
echo ""
echo "전체 서비스 시작:"
echo "  docker compose -f docker-compose.yml -f docker-compose.ssl.yml up -d"
