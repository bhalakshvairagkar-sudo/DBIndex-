$baseDir = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $baseDir "engine\bin"

if (!(Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

Write-Host "[Build] Compiling indexer_engine.exe..." -ForegroundColor Cyan
g++ -std=c++14 -O3 -I "$baseDir\engine\include" "$baseDir\engine\src\main.cpp" -o "$binDir\indexer_engine.exe"
if ($LASTEXITCODE -ne 0) {
    Write-Error "[Error] Failed to compile indexer_engine.exe"
    exit $LASTEXITCODE
}

Write-Host "[Build] Compiling engine_tests.exe..." -ForegroundColor Cyan
g++ -std=c++14 -O3 -I "$baseDir\engine\include" "$baseDir\engine\tests\test_indexes.cpp" -o "$binDir\engine_tests.exe"
if ($LASTEXITCODE -ne 0) {
    Write-Error "[Error] Failed to compile engine_tests.exe"
    exit $LASTEXITCODE
}

Write-Host "[Build] Successfully compiled engine binaries to $binDir!" -ForegroundColor Green
