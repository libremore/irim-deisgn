@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to preview the portfolio.
  pause
  exit /b 1
)
echo Keep this window open. Portfolio folder changes are updated automatically.
echo Open the preview URL shown below and refresh after changing photos.
node scripts/preview.mjs
if errorlevel 1 pause
