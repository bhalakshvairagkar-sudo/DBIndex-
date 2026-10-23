@echo off
setlocal
echo [Build] Building Database Indexing Engine C++ ...
set BASE_DIR=%~dp0..
set BIN_DIR=%BASE_DIR%\engine\bin

if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

echo [Build] Compiling indexer_engine.exe...
g++ -std=c++14 -O3 -I "%BASE_DIR%\engine\include" "%BASE_DIR%\engine\src\main.cpp" -o "%BIN_DIR%\indexer_engine.exe"
if %ERRORLEVEL% neq 0 (
    echo [Error] Failed to compile indexer_engine.exe
    exit /b %ERRORLEVEL%
)

echo [Build] Compiling engine_tests.exe...
g++ -std=c++14 -O3 -I "%BASE_DIR%\engine\include" "%BASE_DIR%\engine\tests\test_indexes.cpp" -o "%BIN_DIR%\engine_tests.exe"
if %ERRORLEVEL% neq 0 (
    echo [Error] Failed to compile engine_tests.exe
    exit /b %ERRORLEVEL%
)

echo [Build] Successfully compiled engine binaries to %BIN_DIR%!
endlocal
