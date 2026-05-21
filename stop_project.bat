@echo off
REM ============================================================================
REM  Personalized Learning System - Stop Launcher (Windows)
REM  Fast netstat-based cleanup — no WMI / Get-CimInstance scans.
REM ============================================================================

setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "PS_UTIL=%ROOT%scripts\launcher_util.ps1"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

echo.
echo ============================================================
echo   Personalized Learning System - Stopping...
echo ============================================================
echo.

if not exist "%PS_UTIL%" (
  echo [WARN] Helper script missing; using netstat-only cleanup.
)

echo [PHASE 1] Stop window titles and ports...
call :log_begin "STOP kill_port 8000"
call :kill_port %BACKEND_PORT% Backend
call :log_end "STOP kill_port 8000"

call :log_begin "STOP kill_port 5173"
call :kill_port %FRONTEND_PORT% Frontend
call :log_end "STOP kill_port 5173"

call :log_begin "STOP taskkill PLS windows"
taskkill /FI "WINDOWTITLE eq PLS-Backend*" /T /F >nul 2>&1
if not errorlevel 1 echo [OK] Closed PLS-Backend window.
taskkill /FI "WINDOWTITLE eq PLS-Frontend*" /T /F >nul 2>&1
if not errorlevel 1 echo [OK] Closed PLS-Frontend window.
call :log_end "STOP taskkill"

echo [PHASE 2] Confirm ports are free...
call :log_begin "STOP wait 8000 free"
call :wait_for_port_free %BACKEND_PORT% 12
if errorlevel 1 (echo [WARN] Port %BACKEND_PORT% may still be busy.) else (echo [OK] Port %BACKEND_PORT% is free.)
call :log_end "STOP wait 8000 free"

call :log_begin "STOP wait 5173 free"
call :wait_for_port_free %FRONTEND_PORT% 12
if errorlevel 1 (echo [WARN] Port %FRONTEND_PORT% may still be busy.) else (echo [OK] Port %FRONTEND_PORT% is free.)
call :log_end "STOP wait 5173 free"

echo.
echo ============================================================
echo   Stop complete. Safe to run start_project.bat again.
echo ============================================================
echo.
exit /b 0

:log_begin
echo [DEBUG] BEGIN %~1 at !TIME!
exit /b 0

:log_end
echo [DEBUG] END   %~1 at !TIME!
exit /b 0

:kill_port
set "PORT=%~1"
set "LABEL=%~2"
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /C:":%~1 " ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo [STOP] !LABEL! - PID %%a on port %~1...
  taskkill /F /PID %%a >nul 2>&1
  if errorlevel 1 (echo [WARN] Could not kill PID %%a) else (echo [OK] Stopped PID %%a)
)
if "!FOUND!"=="0" echo [INFO] No listener on port %~1.
exit /b 0

:wait_for_port_free
set "WP_PORT=%~1"
set /a "WP_RETRIES=%~2"
if not exist "%PS_UTIL%" goto :wp_free_netstat
:wp_free_loop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action PortListening -Port %WP_PORT% -TimeoutSec 3 >nul 2>&1
if errorlevel 1 exit /b 0
set /a WP_RETRIES-=1
if !WP_RETRIES! LEQ 0 exit /b 1
ping 127.0.0.1 -n 2 >nul
goto :wp_free_loop

:wp_free_netstat
netstat -ano 2>nul | findstr /C:":%WP_PORT% " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 exit /b 0
set /a WP_RETRIES-=1
if %WP_RETRIES% LEQ 0 exit /b 1
ping 127.0.0.1 -n 2 >nul
goto :wp_free_netstat
