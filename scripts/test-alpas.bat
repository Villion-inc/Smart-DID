@echo off
chcp 65001 > nul
title ALPAS 연동 테스트

echo ========================================
echo   ALPAS API 연동 테스트
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

cd /d "%~dp0..\library-did-main\packages\backend"

echo [테스트] ALPAS 서버 연결 및 API 응답 확인 중...
echo.

call npx tsx scripts/test-alpas.ts

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   ALPAS 연동 실패
    echo ========================================
    echo.
    echo   내부망 ALPAS 서버에 연결할 수 없습니다.
    echo   클라우드 베타 버전으로 이동합니다.
    echo.
    echo   URL: %CLOUD_URL%
    echo.
    timeout /t 3 /nobreak > nul
    start "" "%CLOUD_URL%"
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ALPAS 연동 성공!
echo ========================================
echo.
echo   로컬 설치를 진행하세요.
echo   setup.bat → start-all.bat 순서로 실행
echo.
pause
