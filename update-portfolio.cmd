@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to update the portfolio.
  pause
  exit /b 1
)
node scripts/build.mjs
if errorlevel 1 (
  echo Portfolio update failed. Review the error above.
  pause
  exit /b 1
)
echo Portfolio updated. Open portfolio.html to view the result.
pause
