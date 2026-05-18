@echo off
REM ============================================================================
REM  Personalized Learning System - Stop Launcher (Windows)
REM  Stops backend (port 8000) and frontend (port 5173) processes.
REM ============================================================================

echo.
echo ============================================================
echo   Personalized Learning System - Stopping...
echo ============================================================
echo.

REM --- Stop backend on port 8000 -----------------------------------------------
set "FOUND8000=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
  set "FOUND8000=1"
  echo [STOP] Backend - terminating PID %%a on port 8000...
  taskkill /F /PID %%a >nul 2>&1
  if errorlevel 1 (
    echo [WARN] Could not kill PID %%a
  ) else (
    echo [OK] Stopped PID %%a
  )
)
if "%FOUND8000%"=="0" echo [INFO] No process listening on port 8000

REM --- Stop frontend on port 5173 ---------------------------------------------
set "FOUND5173=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
  set "FOUND5173=1"
  echo [STOP] Frontend - terminating PID %%a on port 5173...
  taskkill /F /PID %%a >nul 2>&1
  if errorlevel 1 (
    echo [WARN] Could not kill PID %%a
  ) else (
    echo [OK] Stopped PID %%a
  )
)
if "%FOUND5173%"=="0" echo [INFO] No process listening on port 5173

REM --- Close launcher terminal windows if still open --------------------------
taskkill /FI "WINDOWTITLE eq PLS-Backend*" /T /F >nul 2>&1
if not errorlevel 1 echo [OK] Closed PLS-Backend window

taskkill /FI "WINDOWTITLE eq PLS-Frontend*" /T /F >nul 2>&1
if not errorlevel 1 echo [OK] Closed PLS-Frontend window

REM --- Fallback: PowerShell stops any remaining listeners on our ports ---------
where powershell >nul 2>&1
if not errorlevel 1 (
  powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
  if not errorlevel 1 echo [OK] PowerShell port cleanup completed.
)

echo.
echo ============================================================
echo   Stop complete.
echo ============================================================
echo.
