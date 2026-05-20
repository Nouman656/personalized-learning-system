@echo off
REM ============================================================================
REM  Personalized Learning System - Start Launcher (Windows)
REM  Starts backend FastAPI and frontend Vite automatically.
REM ============================================================================

setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\venv"
set "VENV_PY=%VENV%\Scripts\python.exe"
set "VENV_PIP=%VENV%\Scripts\pip.exe"
set "BACKEND_ENV=%BACKEND%\.env"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"
set "POSTGRES_PORT=5432"
set "BACKEND_URL=http://127.0.0.1:%BACKEND_PORT%"
set "FRONTEND_URL=http://127.0.0.1:%FRONTEND_PORT%"

echo.
echo ============================================================
echo   Personalized Learning System - Starting...
echo ============================================================
echo.

if not exist "%BACKEND%\" (
  echo [ERROR] Backend folder not found: %BACKEND%
  exit /b 1
)
if not exist "%FRONTEND%\" (
  echo [ERROR] Frontend folder not found: %FRONTEND%
  exit /b 1
)

echo [CLEANUP] Stopping stale backend/frontend processes...
call :kill_port %BACKEND_PORT% Backend
call :kill_port %FRONTEND_PORT% Frontend
taskkill /FI "WINDOWTITLE eq PLS-Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PLS-Frontend*" /T /F >nul 2>&1
call :powershell_port_cleanup

call :wait_for_port_free %BACKEND_PORT% 12
if errorlevel 1 (
  echo [ERROR] Port %BACKEND_PORT% is still in use.
  exit /b 1
)
call :wait_for_port_free %FRONTEND_PORT% 12
if errorlevel 1 (
  echo [ERROR] Port %FRONTEND_PORT% is still in use.
  exit /b 1
)

set "PYTHON_CMD="
where python >nul 2>&1 && set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
  where py >nul 2>&1 && set "PYTHON_CMD=py -3"
)
if not defined PYTHON_CMD (
  echo [ERROR] Python not found. Install Python 3.10+ and add it to PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js and add it to PATH.
  exit /b 1
)

if not exist "%VENV_PY%" (
  echo [SETUP] Creating backend virtual environment...
  %PYTHON_CMD% -m venv "%VENV%"
  if errorlevel 1 (
    echo [ERROR] Failed to create backend virtual environment.
    exit /b 1
  )
)

"%VENV_PY%" -c "import fastapi, uvicorn, sqlalchemy, dotenv, psycopg2" >nul 2>&1
if errorlevel 1 (
  echo [SETUP] Installing backend requirements...
  "%VENV_PIP%" install -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed.
    exit /b 1
  )
)

if not exist "%BACKEND_ENV%" (
  echo [SETUP] backend\.env not found. Creating default PostgreSQL config...
  (
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=personalized_learning_system
    echo DB_USER=postgres
    echo DB_PASSWORD=postgres
    echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personalized_learning_system
  ) > "%BACKEND_ENV%"
)

echo [CHECK] Verifying PostgreSQL port %POSTGRES_PORT%...
call :check_postgres_service
call :wait_for_port_listen %POSTGRES_PORT% 8
if errorlevel 1 (
  echo [ERROR] PostgreSQL is not listening on port %POSTGRES_PORT%.
  echo         Start the PostgreSQL service, then re-run start_project.bat.
  exit /b 1
)

echo [CHECK] Verifying PostgreSQL database connection...
pushd "%BACKEND%"
"%VENV_PY%" -c "from app.database import check_db_connection; check_db_connection(); print('postgres-ok')" >nul 2>&1
if errorlevel 1 (
  popd
  echo [ERROR] PostgreSQL connection failed.
  echo         Verify DB_HOST/DB_PORT/DB_USER/DB_PASSWORD in backend\.env.
  exit /b 1
)
popd

echo [SETUP] Ensuring PostgreSQL tables and seed data...
pushd "%BACKEND%"
"%VENV_PY%" app\seed_data.py
if errorlevel 1 (
  popd
  echo [ERROR] Database seed failed.
  exit /b 1
)
popd

if not exist "%FRONTEND%\node_modules\" (
  echo [SETUP] Installing frontend dependencies...
  pushd "%FRONTEND%"
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Frontend npm install failed.
    exit /b 1
  )
  popd
)

echo [START] Backend API on port %BACKEND_PORT%...
start "PLS-Backend" /D "%BACKEND%" cmd /k ""%VENV_PY%" -m uvicorn app.main:app --host 127.0.0.1 --port %BACKEND_PORT%"

echo [WAIT] Verifying backend startup...
call :wait_for_health "%BACKEND_URL%/health" 25
if errorlevel 1 (
  echo [ERROR] Backend failed health check. Check the PLS-Backend window.
  exit /b 1
)
echo [OK] Backend is healthy.

echo [START] Frontend dev server on port %FRONTEND_PORT%...
start "PLS-Frontend" /D "%FRONTEND%" cmd /k "npm run dev -- --host 127.0.0.1 --port %FRONTEND_PORT%"

echo [WAIT] Verifying frontend port...
call :wait_for_port_listen %FRONTEND_PORT% 20
if errorlevel 1 (
  echo [ERROR] Frontend failed to listen on port %FRONTEND_PORT%.
  exit /b 1
)

echo [OPEN] Opening browser...
start "" "%FRONTEND_URL%"

echo.
echo ============================================================
echo   Project started successfully.
echo.
echo   Backend:  %BACKEND_URL%
echo   API Docs: %BACKEND_URL%/docs
echo   Frontend: %FRONTEND_URL%
echo.
echo   To stop everything, run stop_project.bat
echo ============================================================
echo.
exit /b 0

:kill_port
set "PORT=%~1"
set "LABEL=%~2"
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo [CLEANUP] Killing !LABEL! PID %%a on port !PORT!...
  taskkill /F /PID %%a >nul 2>&1
)
if "!FOUND!"=="0" echo [CLEANUP] No listener on port !PORT!.
exit /b 0

:powershell_port_cleanup
where powershell.exe >nul 2>&1
if errorlevel 1 exit /b 0
powershell.exe -NoProfile -Command ^
  "Get-NetTCPConnection -LocalPort %BACKEND_PORT%,%FRONTEND_PORT% -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
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

:wait_for_port_listen
set "PORT=%~1"
set /a "RETRIES=%~2"
:loop_wait_listen
powershell.exe -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a RETRIES-=1
if !RETRIES! LEQ 0 exit /b 1
timeout /t 1 /nobreak >nul
goto :loop_wait_listen

:wait_for_health
set "URL=%~1"
set /a "RETRIES=%~2"
:loop_wait_health
powershell.exe -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a RETRIES-=1
if !RETRIES! LEQ 0 exit /b 1
timeout /t 1 /nobreak >nul
goto :loop_wait_health

:check_postgres_service
powershell.exe -NoProfile -Command ^
  "$svc = Get-Service | Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'PostgreSQL' }; if ($svc) { if (($svc | Where-Object { $_.Status -eq 'Running' }).Count -gt 0) { exit 0 } else { exit 2 } } else { exit 3 }" >nul 2>&1
if errorlevel 3 (
  echo [WARN] PostgreSQL service not found by name. Will verify using port and login checks.
  exit /b 0
)
if errorlevel 2 (
  echo [ERROR] PostgreSQL service exists but is not running.
  echo         Start the PostgreSQL service, then re-run start_project.bat.
  exit /b 1
)
echo [OK] PostgreSQL service is running.
exit /b 0