@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Smart DID Local Setup

echo ========================================
echo   Smart DID Local Setup
echo   (Node.js + Project Build)
echo ========================================
echo.
echo   DB/Video: GCP Cloud
echo   Video Gen: Cloud Admin
echo   Local: Backend + Frontend only
echo.

:: Cloud Beta URL
set "CLOUD_URL=https://did-frontend-730268485621.asia-northeast3.run.app"

:: ========================================
:: 1. Admin check
:: ========================================
net session >nul 2>&1
if !errorlevel! neq 0 (
    echo [Info] Requesting admin privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: ========================================
:: 2. Node.js install
:: ========================================
where node >nul 2>nul
if !errorlevel! equ 0 (
    echo [OK] Node.js already installed.
    node --version
    goto :setup_gcp
)

echo [1/6] Node.js download...

set "NODE_URL=https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
set "DOWNLOAD_PATH=%TEMP%\node-v20.11.1-x64.msi"

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%DOWNLOAD_PATH%'}"

if not exist "%DOWNLOAD_PATH%" (
    echo [Error] Node.js download failed.
    echo         Please install manually: https://nodejs.org/
    pause
    exit /b 1
)

echo [2/6] Installing Node.js...
msiexec /i "%DOWNLOAD_PATH%" /passive /norestart

set "PATH=%PATH%;C:\Program Files\nodejs"
timeout /t 5 /nobreak > nul

where node >nul 2>nul
if !errorlevel! neq 0 (
    echo [Info] Node.js installed. Please restart PC and run again.
    del "%DOWNLOAD_PATH%" >nul 2>nul
    pause
    exit /b 0
)

echo [OK] Node.js installed:
node --version
del "%DOWNLOAD_PATH%" >nul 2>nul

:: ========================================
:: 3. GCP Auth (for video access, one-time)
:: ========================================
:setup_gcp
echo.
if exist "%APPDATA%\gcloud\application_default_credentials.json" (
    echo [OK] GCP auth already configured.
    goto :setup_env
)

where gcloud >nul 2>nul
if !errorlevel! neq 0 (
    echo [Info] Google Cloud SDK not found. Installing...
    set "GCLOUD_INSTALLER=%TEMP%\GoogleCloudSDKInstaller.exe"
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe' -OutFile '!GCLOUD_INSTALLER!'}"
    if exist "!GCLOUD_INSTALLER!" (
        "!GCLOUD_INSTALLER!" /S
        set "PATH=!PATH!;C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin;%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin"
        timeout /t 5 /nobreak > nul
    ) else (
        echo [Warning] Google Cloud SDK download failed.
        echo           Video playback may not work.
        echo           Manual install: https://cloud.google.com/sdk/docs/install
        pause
    )
)

where gcloud >nul 2>nul
if !errorlevel! equ 0 (
    echo.
    echo ========================================
    echo   GCP Auth (one-time)
    echo ========================================
    echo.
    echo   Browser will open. Sign in with Google account.
    echo.
    call gcloud auth application-default login --project=asanlibrary
    echo.
    echo [OK] GCP auth complete.
)

:: ========================================
:: 4. Environment variables
:: ========================================
:setup_env
echo.
cd /d "%~dp0..\library-did-main"
if !errorlevel! neq 0 (
    echo [Error] Cannot find library-did-main folder.
    echo         Expected: %~dp0..\library-did-main
    pause
    exit /b 1
)

echo [OK] Project dir: %CD%

if exist ".env" (
    echo [OK] .env file exists.
    echo.
    echo   Check ALPAS settings:
    echo.
    findstr /B "ALPAS_" ".env"
    echo.
    choice /C YN /N /M "  Edit .env? (Y/N): "
    if !errorlevel! equ 1 (
        start notepad ".env"
        echo   Save and close notepad, then press any key...
        pause
    )
) else (
    echo [3/6] Creating .env file...
    copy "%~dp0.env.template" ".env" >nul
    if not exist ".env" (
        echo [Error] Failed to create .env file.
        echo         Template: %~dp0.env.template
        pause
        exit /b 1
    )
    echo.
    echo ========================================
    echo   Environment Setup
    echo ========================================
    echo.
    echo   .env file created.
    echo   Edit ALPAS settings in notepad:
    echo.
    echo   - ALPAS_API_URL  (Library API URL)
    echo   - ALPAS_API_KEY  (Library API Key)
    echo   - ALPAS_LIB_NO   (Library Number)
    echo.

    start notepad ".env"
    echo   Edit .env, save, then press any key...
    pause
)

:: ========================================
:: 5. npm install (BEFORE ALPAS test)
:: ========================================
echo.
echo [4/6] Installing dependencies... (3-5 min)
call npm install --legacy-peer-deps
if !errorlevel! neq 0 (
    echo [Error] npm install failed.
    echo         Check Node.js and network connection.
    pause
    exit /b 1
)

:: ========================================
:: 6. ALPAS connectivity test (AFTER npm install)
:: ========================================
echo.
echo [5/6] Testing ALPAS connection...

:: First, quick check with PowerShell (no tsx needed)
for /f "tokens=*" %%A in ('findstr /B "ALPAS_API_URL=" ".env"') do set "%%A"
if "!ALPAS_API_URL!"=="" goto :alpas_skip
if "!ALPAS_API_URL!"=="YOUR_ALPAS_API_URL_HERE" goto :alpas_skip

echo   Testing connection to !ALPAS_API_URL!...
powershell -Command "& {try { $r = Invoke-WebRequest -Uri '!ALPAS_API_URL!' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }}" >nul 2>&1
if !errorlevel! equ 0 (
    echo   [OK] ALPAS server reachable.
    goto :alpas_done
)

echo.
echo ========================================
echo   [Warning] ALPAS connection failed
echo ========================================
echo.
echo   Cannot reach ALPAS server: !ALPAS_API_URL!
echo.
echo   [1] Use Cloud Beta (stop local install)
echo       - No installation needed
echo       - Uses test data for search
echo.
echo   [2] Continue local install (without search)
echo       - Recommendations, video, admin work fine
echo       - Search available after ALPAS connection
echo.
choice /C 12 /N /M "  Choose (1 or 2): "
if !errorlevel! equ 1 (
    echo.
    echo   Opening Cloud Beta...
    timeout /t 2 /nobreak > nul
    start "" "%CLOUD_URL%"
    pause
    exit /b 0
)
echo.
echo   Continuing local install...
goto :alpas_done

:alpas_skip
echo   ALPAS_API_URL not set. Skipping test.
echo   Search/new arrivals will use mock data.

:alpas_done

:: Copy .env to backend
copy ".env" "packages\backend\.env" >nul 2>nul

:: ========================================
:: 7. Prisma setup
:: ========================================
echo.
echo [6/6] Prisma setup...
cd packages\backend
call npx prisma generate
call npx prisma db push --accept-data-loss
cd ..\..

:: ========================================
:: 8. Build
:: ========================================
echo.
echo [7/7] Building...
call npm run build --workspace=@smart-did/shared
if !errorlevel! neq 0 (
    echo [Warning] Shared package build failed, continuing...
)

call npm run build --workspace=@smart-did/backend
if !errorlevel! neq 0 (
    echo [Error] Backend build failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo   Run start-all.bat to start the server.
echo.
echo   * Video generation: handled by Cloud Admin
echo   * Redis: not required
echo.
pause
