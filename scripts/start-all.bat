@echo off
chcp 65001 > nul
title 스마트 DID 전체 실행

echo ========================================
echo   스마트 DID 전체 실행
echo   (백엔드 + 워커 + 프론트엔드)
echo ========================================
echo.

:: Node.js 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo       setup.bat을 먼저 실행해주세요.
    pause
    exit /b 1
)

:: 프로젝트 디렉토리로 이동
cd /d "%~dp0..\library-did-main"

:: 빌드 확인
if not exist "packages\backend\dist\index.js" (
    echo [오류] 빌드 파일이 없습니다. setup.bat을 먼저 실행해주세요.
    pause
    exit /b 1
)

:: Redis 서비스 확인 및 시작
echo [준비] Redis 서비스 확인 중...
set "REDIS_RUNNING=0"

:: Memurai 서비스 확인
sc query Memurai >nul 2>nul
if %errorlevel% equ 0 (
    net start Memurai >nul 2>nul
    echo        Memurai 서비스 실행 중
    set "REDIS_RUNNING=1"
)

:: redis-server 확인 (다른 Redis)
if "%REDIS_RUNNING%"=="0" (
    where redis-server >nul 2>nul
    if %errorlevel% equ 0 (
        start /B redis-server >nul 2>nul
        echo        Redis 서버 시작됨
        set "REDIS_RUNNING=1"
    )
)

if "%REDIS_RUNNING%"=="0" (
    echo        [경고] Redis 미설치 - 영상 생성 기능 제한
)

:: 현재 디렉토리 저장
set "BASE_DIR=%CD%"

echo.
echo [1/3] 백엔드 서버 시작 중...
start "Smart DID Backend" /D "%BASE_DIR%\packages\backend" cmd /k node dist/index.js

timeout /t 2 /nobreak > nul

echo [2/3] 워커 시작 중...
if exist "%BASE_DIR%\packages\worker\dist\index.js" (
    start "Smart DID Worker" /D "%BASE_DIR%\packages\worker" cmd /k node dist/index.js
) else (
    echo        [건너뜀] 워커 빌드 파일 없음
)

timeout /t 2 /nobreak > nul

echo [3/3] 프론트엔드 서버 시작 중...
start "Smart DID Frontend" /D "%BASE_DIR%\packages\frontend" cmd /k npm run dev

echo.
echo ========================================
echo   서버가 실행되었습니다
echo ========================================
echo   백엔드:     http://localhost:3001
echo   프론트엔드: http://localhost:5173
echo   워커:       백그라운드 실행 중
echo ========================================
echo.
echo 브라우저에서 http://localhost:5173 접속하세요.
echo 각 창을 닫으면 해당 서비스가 종료됩니다.
echo.

:: 브라우저 자동 열기 (5초 후)
timeout /t 5 /nobreak > nul
start "" "http://localhost:5173"

pause
