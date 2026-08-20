@echo off
REM zelm-library local dev launcher (纯前端版：无后端)
REM 启动静态站点 http.server :8000 即可预览
title zelm-library launcher
echo Starting static site on port 8000...
cd /d "%~dp0"

REM 兼容 python / py -3 两种环境
where python >nul 2>nul
if %errorlevel%==0 (
  set "PYCMD=python"
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set "PYCMD=py -3"
  ) else (
    echo [ERROR] Python not found. Please install Python first.
    pause
    exit /b 1
  )
)

start "zelm-static-8000" cmd /k "%PYCMD% -m http.server 8000 --bind 127.0.0.1"
timeout /t 3 /nobreak >nul
start http://localhost:8000/
echo.
echo Done. Open http://localhost:8000/
echo Close this window. Keep the static window open.
pause
