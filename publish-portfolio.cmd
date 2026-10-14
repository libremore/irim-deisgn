@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js and run this file again.
  pause
  exit /b 1
)
node scripts/publish.mjs %*
set "publishExit=%errorlevel%"
if not "%publishExit%"=="0" echo Update failed. Review the message above and run again after fixing it.
pause
exit /b %publishExit%
