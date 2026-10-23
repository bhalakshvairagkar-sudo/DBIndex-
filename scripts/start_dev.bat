@echo off
setlocal
echo ====================================================
echo Starting Database Indexing Simulator Full-Stack App
echo ====================================================

set ROOT_DIR=%~dp0..

echo [1/3] Verifying C++ engine build...
if not exist "%ROOT_DIR%\engine\bin\indexer_engine.exe" (
    call "%ROOT_DIR%\scripts\build_engine.bat"
)

echo [2/3] Starting Express Backend on port 4000...
start "Database Indexing Simulator - Backend" cmd /k "cd /d %ROOT_DIR%\backend && npm run dev"

timeout /t 2 >nul

echo [3/3] Starting Vite Frontend on port 3000...
start "Database Indexing Simulator - Frontend" cmd /k "cd /d %ROOT_DIR%\frontend && npm run dev"

echo ====================================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:4000
echo Engine:   C++17 Binary linked via stdin/stdout
echo ====================================================
endlocal
