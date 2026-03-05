@echo off
chcp 65001 > nul
title 스마트 DID 로컬 설치

echo ========================================
echo   스마트 DID 로컬 설치
echo   (Node.js + 프로젝트 빌드)
echo ========================================
echo.
echo   DB/영상: GCP 클라우드 사용
echo   영상 생성: 클라우드 Worker 처리
echo   로컬: Backend + Frontend만 실행
echo.

:: 관리자 권한 확인
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [알림] 관리자 권한으로 실행합니다...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ========================================
:: 1. Node.js 설치
:: ========================================
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [확인] Node.js가 이미 설치되어 있습니다.
    node --version
    goto :install_project
)

echo [1/6] Node.js 다운로드 중...
echo      (인터넷 연결이 필요합니다)
echo.

set "NODE_VERSION=20.11.1"
set "NODE_INSTALLER=node-v%NODE_VERSION%-x64.msi"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_INSTALLER%"
set "DOWNLOAD_PATH=%TEMP%\%NODE_INSTALLER%"

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%DOWNLOAD_PATH%'}"

if not exist "%DOWNLOAD_PATH%" (
    echo [오류] Node.js 다운로드 실패
    echo       https://nodejs.org/ 에서 수동 설치해주세요.
    pause
    exit /b 1
)

echo [2/6] Node.js 설치 중...
msiexec /i "%DOWNLOAD_PATH%" /passive /norestart

set "PATH=%PATH%;C:\Program Files\nodejs"
timeout /t 5 /nobreak > nul

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [알림] Node.js 설치 완료. PC를 재시작한 후 다시 실행해주세요.
    del "%DOWNLOAD_PATH%" >nul 2>nul
    pause
    exit /b 0
)

echo [확인] Node.js 설치 완료:
node --version
del "%DOWNLOAD_PATH%" >nul 2>nul

:: ========================================
:: 2. 환경변수 설정
:: ========================================
:install_project
echo.
cd /d "%~dp0..\library-did-main"

:: .env 파일 존재 여부 확인
if exist ".env" (
    echo [확인] 환경변수 파일(.env)이 이미 존재합니다.
) else (
    echo [3/6] 환경변수 파일 생성 중...
    copy "%~dp0.env.template" ".env" >nul
    echo.
    echo ========================================
    echo   환경변수 설정 확인
    echo ========================================
    echo.
    echo   .env 파일이 생성되었습니다.
    echo   메모장에서 ALPAS 설정을 확인하세요:
    echo.
    echo   - ALPAS_API_URL  (도서관 API 주소)
    echo   - ALPAS_API_KEY  (도서관 API 키)
    echo   - ALPAS_LIB_NO   (도서관 번호)
    echo.
    echo ========================================
    echo.

    :: 메모장으로 .env 파일 열기
    start notepad ".env"

    echo 환경변수 확인 후 아무 키나 누르면 계속 진행합니다...
    pause
)

:: ========================================
:: 3. 프로젝트 설치
:: ========================================
echo.
echo [4/6] 의존성 설치 중... (약 3-5분 소요)
call npm install --legacy-peer-deps

echo.
echo [5/6] Prisma 설정 중...
cd packages\backend
call npx prisma generate
call npx prisma db push --accept-data-loss
cd ..\..

echo.
echo [6/6] 빌드 중...
call npm run build --workspace=@smart-did/shared
if %errorlevel% neq 0 (
    echo [경고] 공유 패키지 빌드 실패, 계속 진행합니다...
)

call npm run build --workspace=@smart-did/backend
if %errorlevel% neq 0 (
    echo [오류] 백엔드 빌드 실패
    pause
    exit /b 1
)

echo.
echo ========================================
echo   설치 완료!
echo ========================================
echo.
echo   start-all.bat을 더블클릭하여 실행하세요.
echo.
echo   ※ 영상 생성은 클라우드에서 처리됩니다.
echo   ※ Redis 설치는 필요하지 않습니다.
echo.
pause
