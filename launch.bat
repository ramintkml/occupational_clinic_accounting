@echo off
echo ====================================
echo   Therapist Accounting System
echo ====================================
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting server...
echo.
echo Server will open at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
start http://localhost:3000
node server.js