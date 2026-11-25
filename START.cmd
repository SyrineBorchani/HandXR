@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 20.19+ or 22.12+ first, then run this file again.
  pause
  exit /b 1
)
call npm.cmd install
if errorlevel 1 (
  echo Dependency installation failed. Check your Internet connection.
  pause
  exit /b 1
)
echo Open the localhost URL shown below in your browser.
call npm.cmd run dev
