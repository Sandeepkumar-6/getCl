@echo off
setlocal
cd /d "%~dp0"
title getClaim - Local development
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is missing. Install Node.js 20 or 22 LTS and try again.
 pause
 exit /b 1
)
if not exist node_modules\vite (
 echo Installing getClaim dependencies...
 call npm install
 if errorlevel 1 (
  echo Dependency installation failed. Check your connection and retry.
  pause
  exit /b 1
 )
)
node scripts\init-env.js
if errorlevel 1 (
 pause
 exit /b 1
)
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000/api/health
echo Run npm run seed first if you have not created demo records.
call npm run dev
echo getClaim has stopped. Review any errors above.
pause
