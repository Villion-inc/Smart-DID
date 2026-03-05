@echo off
chcp 65001 > nul
title 스마트 DID 로컬 설치

echo ========================================
echo   스마트 DID 로컬 설치
echo   (Node.js + 프로젝트 빌드)
echo ========================================
echo.
echo   DB/영상: GCP 클라우드 사용
echo   영상 생성: 클라우드 Admin에서 처리
echo   로컬: Backend + Frontend만 실행
echo.

:: 클라우드 베타 URL
set "CLOUD_URL=https://did-frontend-730268485621.asia-northeast3.run.app"

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
    goto :setup_gcp
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
:: 2. GCP 인증 (영상 파일 접근용, 최초 1회만)
:: ========================================
:setup_gcp
echo.
if exist "%APPDATA%\gcloud\application_default_credentials.json" (
    echo [확인] GCP 인증이 이미 설정되어 있습니다.
    goto :setup_env
)

where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo [알림] Google Cloud SDK 설치 중...
    echo        (영상 파일 접근에 필요합니다)
    echo.
    set "GCLOUD_INSTALLER=%TEMP%\GoogleCloudSDKInstaller.exe"
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe' -OutFile '%GCLOUD_INSTALLER%'}"
    if exist "%GCLOUD_INSTALLER%" (
        "%GCLOUD_INSTALLER%" /S
        set "PATH=%PATH%;C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin;%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin"
        timeout /t 5 /nobreak > nul
    ) else (
        echo [경고] Google Cloud SDK 다운로드 실패. 영상 재생이 안 될 수 있습니다.
        echo        https://cloud.google.com/sdk/docs/install 에서 수동 설치해주세요.
        pause
    )
)

where gcloud >nul 2>nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   GCP 인증 (최초 1회)
    echo ========================================
    echo.
    echo   브라우저가 열리면 Google 계정으로 로그인하세요.
    echo   (영상 파일 접근 권한을 위한 인증입니다)
    echo.
    call gcloud auth application-default login --project=asanlibrary
    echo.
    echo [확인] GCP 인증 완료
)

:: ========================================
:: 3. 환경변수 설정
:: ========================================
:setup_env
echo.
cd /d "%~dp0..\library-did-main"

if exist ".env" (
    echo [확인] 환경변수 파일(.env)이 이미 존재합니다.
    echo.
    echo   ALPAS 설정이 도서관 내부망 주소로 되어 있는지 확인하세요.
    echo   현재 ALPAS 설정:
    echo.
    findstr /B "ALPAS_" ".env"
    echo.
    echo   수정이 필요하면 Y, 그대로 진행하려면 아무 키나 누르세요.
    choice /C YN /N /M "  .env 수정하시겠습니까? (Y/N): "
    if %errorlevel% equ 1 (
        start notepad ".env"
        echo   메모장에서 수정 후 저장하고 아무 키나 누르세요...
        pause
    )
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

    start notepad ".env"
    echo   환경변수 확인 후 아무 키나 누르면 계속 진행합니다...
    pause
)

:: ========================================
:: 4. ALPAS 연동 테스트
:: ========================================
echo.
echo [확인] ALPAS 연동 테스트 중...
copy ".env" "packages\backend\.env" >nul 2>nul
cd packages\backend
call npx tsx scripts/test-alpas.ts
if %errorlevel% neq 0 (
    echo.
    echo [실패] ALPAS 연동 실패. 클라우드 베타 버전으로 이동합니다.
    echo   URL: %CLOUD_URL%
    timeout /t 3 /nobreak > nul
    start "" "%CLOUD_URL%"
    pause
    exit /b 1
)
cd ..\..

:: ========================================
:: 5. 프로젝트 설치
:: ========================================
echo.
echo [5/7] 의존성 설치 중... (약 3-5분 소요)
call npm install --legacy-peer-deps

echo.
echo [6/7] Prisma 설정 중...
:: .env를 backend에도 복사 (Prisma가 현재 디렉토리에서 .env를 찾음)
copy ".env" "packages\backend\.env" >nul 2>nul
cd packages\backend
call npx prisma generate
call npx prisma db push --accept-data-loss
cd ..\..

echo.
echo [7/7] 빌드 중...
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
echo   ※ 영상 생성은 클라우드 Admin에서 처리됩니다.
echo   ※ Redis 설치는 필요하지 않습니다.
echo.
pause
