$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting Database Indexing Simulator Full-Stack App" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Verify C++ engine binary
$engineBin = Join-Path $rootDir "engine\bin\indexer_engine.exe"
if (!(Test-Path $engineBin)) {
    Write-Host "[1/3] Building C++ engine..." -ForegroundColor Yellow
    & "$rootDir\scripts\build_engine.ps1"
} else {
    Write-Host "[1/3] C++ engine binary ready." -ForegroundColor Green
}

# 2. Start Backend
Write-Host "[2/3] Launching Backend on port 4000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Start Frontend
Write-Host "[3/3] Launching Frontend on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; npm run dev"

Write-Host "`nAll services launched!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:4000" -ForegroundColor White
