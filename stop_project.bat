@echo off
REM ============================================================================
REM  Personalized Learning System - Stop Launcher (Windows)
REM  Stops backend (port 8000) and frontend (port 5173) processes.
REM ============================================================================

setlocal EnableExtensions EnableDelayedExpansion
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

echo.
echo ============================================================
echo   Personalized Learning System - Stopping...
echo ============================================================
echo.

call :kill_port %BACKEND_PORT% Backend
call :kill_port %FRONTEND_PORT% Frontend

taskkill /FI "WINDOWTITLE eq PLS-Backend*" /T /F >nul 2>&1
if not errorlevel 1 echo [STOP] Closed PLS-Backend window.
taskkill /FI "WINDOWTITLE eq PLS-Frontend*" /T /F >nul 2>&1
if not errorlevel 1 echo [STOP] Closed PLS-Frontend window.

where powershell.exe >nul 2>&1
if not errorlevel 1 (
  powershell.exe -NoProfile -Command ^
    "Get-NetTCPConnection -LocalPort %BACKEND_PORT%,%FRONTEND_PORT% -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
)

call :wait_for_port_free %BACKEND_PORT% 10
if errorlevel 1 (
  echo [WARN] Port %BACKEND_PORT% is still busy.
) else (
  echo [OK] Port %BACKEND_PORT% is free.
)

call :wait_for_port_free %FRONTEND_PORT% 10
if errorlevel 1 (
  echo [WARN] Port %FRONTEND_PORT% is still busy.
) else (
  echo [OK] Port %FRONTEND_PORT% is free.
)

echo.
echo ============================================================
echo   Stop complete.
echo ============================================================
echo.
exit /b 0

:kill_port
set "PORT=%~1"
set "LABEL=%~2"
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo [STOP] !LABEL! - terminating PID %%a on port !PORT!...
  taskkill /F /PID %%a >nul 2>&1
  if errorlevel 1 (
    echo [WARN] Could not kill PID %%a
  ) else (
    echo [OK] Stopped PID %%a
  )
)
if "!FOUND!"=="0" echo [INFO] No process listening on port !PORT!
exit /b 0

:wait_for_port_free
set "PORT=%~1"
set /a "RETRIES=%~2"
:loop_wait_free
powershell.exe -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a RETRIES-=1
if !RETRIES! LEQ 0 exit /b 1
timeout /t 1 /nobreak >nul
goto :loop_wait_free
