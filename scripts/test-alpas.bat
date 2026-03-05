@echo off
chcp 65001 > nul
title ALPAS 연동 테스트

echo ========================================
echo   ALPAS API 연동 테스트
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

cd /d "%~dp0..\library-did-main\packages\backend"

echo [테스트] ALPAS 서버 연결 및 API 응답 확인 중...
echo.

call npx tsx scripts/test-alpas.ts

echo.
echo ========================================
echo   테스트 완료
echo ========================================
echo.
echo   성공: 검색/신착 도서가 정상 출력되면 로컬 설치 OK
echo   실패: ALPAS 서버 접근 불가 시 네트워크 확인 필요
echo.
pause
