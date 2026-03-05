@echo off
chcp 65001 > nul
title 스마트 DID 실행

echo ========================================
echo   스마트 DID 실행
echo   (백엔드 + 프론트엔드)
echo ========================================
echo.

:: 클라우드 베타 URL
set "CLOUD_URL=https://did-frontend-730268485621.asia-northeast3.run.app"

:: Node.js 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo       setup.bat을 먼저 실행해주세요.
    echo.
    echo       클라우드 베타 버전으로 이동합니다...
    timeout /t 3 /nobreak > nul
    start "" "%CLOUD_URL%"
    pause
    exit /b 1
)

:: 프로젝트 디렉토리로 이동
cd /d "%~dp0..\library-did-main"

:: 빌드 확인
if not exist "packages\backend\dist\index.js" (
    echo [오류] 빌드 파일이 없습니다. setup.bat을 먼저 실행해주세요.
    echo.
    echo       클라우드 베타 버전으로 이동합니다...
    timeout /t 3 /nobreak > nul
    start "" "%CLOUD_URL%"
    pause
    exit /b 1
)

:: 현재 디렉토리 저장
set "BASE_DIR=%CD%"

echo [1/2] 백엔드 서버 시작 중...
start "Smart DID Backend" /D "%BASE_DIR%\packages\backend" cmd /k node dist/index.js

timeout /t 3 /nobreak > nul

echo [2/2] 프론트엔드 서버 시작 중...
start "Smart DID Frontend" /D "%BASE_DIR%\packages\frontend" cmd /k npm run dev

echo.
echo ========================================
echo   서버가 실행되었습니다
echo ========================================
echo   백엔드:     http://localhost:3001
echo   프론트엔드: http://localhost:5173
echo ========================================
echo.
echo   ※ 영상 생성은 클라우드 Admin에서 처리됩니다.
echo   ※ Redis 미설치 경고는 무시해도 됩니다.
echo.
echo   각 창을 닫으면 해당 서비스가 종료됩니다.
echo.

:: 브라우저 자동 열기 (5초 후)
timeout /t 5 /nobreak > nul
start "" "http://localhost:5173"

pause
