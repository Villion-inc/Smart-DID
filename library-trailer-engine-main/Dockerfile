# Trailer Engine Dockerfile

FROM node:20-slim

# FFmpeg 설치
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./
COPY tsconfig.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY src ./src

# TypeScript 컴파일
RUN npm run build

# 디렉토리 생성
RUN mkdir -p output temp

# 포트 노출
EXPOSE 3000

# 환경 변수 (기본값, .env 파일로 오버라이드 가능)
ENV PORT=3000
ENV NODE_ENV=production
ENV OUTPUT_DIR=./output
ENV TEMP_DIR=./temp

# 서버 실행
CMD ["npm", "start"]
