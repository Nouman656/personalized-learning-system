@echo off
REM ============================================================================
REM  Personalized Learning System - Start Launcher (Windows)
REM  Phased startup with timeouts — no blocking WMI / Get-NetTCPConnection scans.
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
set "ML_STORAGE=%BACKEND%\models_storage"
set "ML_MODEL=%ML_STORAGE%\weak_topic_model.joblib"
set "PS_UTIL=%ROOT%scripts\launcher_util.ps1"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"
set "POSTGRES_PORT=5432"
set "BACKEND_URL=http://127.0.0.1:%BACKEND_PORT%"
set "FRONTEND_URL=http://127.0.0.1:%FRONTEND_PORT%"
set "ML_PROBE_STUDENT=__pls_launcher_probe__"
set "STEP_T0=%TIME%"

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
if not exist "%PS_UTIL%" (
  echo [ERROR] Missing helper script: %PS_UTIL%
  exit /b 1
)

REM ============================================================================
echo [PHASE 1] Cleanup
REM ============================================================================
call :log_begin "PHASE1 cleanup ports"
call :kill_port %BACKEND_PORT% Backend
call :kill_port %FRONTEND_PORT% Frontend
call :log_end "PHASE1 kill_port netstat"

call :log_begin "PHASE1 taskkill PLS windows"
taskkill /FI "WINDOWTITLE eq PLS-Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PLS-Frontend*" /T /F >nul 2>&1
call :log_end "PHASE1 taskkill"

REM NOTE: Removed :powershell_port_cleanup (Get-CimInstance Win32_Process / Get-NetTCPConnection)
REM       — that was the hang after "No listener on port" messages.

call :log_begin "PHASE1 wait port 8000 free"
call :wait_for_port_free %BACKEND_PORT% 8
if errorlevel 1 (
  echo [ERROR] Port %BACKEND_PORT% still in use after timeout.
  exit /b 1
)
call :log_end "PHASE1 wait port 8000 free"

call :log_begin "PHASE1 wait port 5173 free"
call :wait_for_port_free %FRONTEND_PORT% 8
if errorlevel 1 (
  echo [ERROR] Port %FRONTEND_PORT% still in use after timeout.
  exit /b 1
)
call :log_end "PHASE1 wait port 5173 free"
echo [OK] PHASE 1 complete.

REM ============================================================================
echo [PHASE 2] Dependency checks
REM ============================================================================
call :log_begin "PHASE2 find python"
set "PYTHON_CMD="
where python >nul 2>&1 && set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
  where py >nul 2>&1 && set "PYTHON_CMD=py -3"
)
if not defined PYTHON_CMD (
  echo [ERROR] Python not found. Install Python 3.10+ and add to PATH.
  exit /b 1
)
call :log_end "PHASE2 find python"

call :log_begin "PHASE2 find npm"
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js LTS and add to PATH.
  exit /b 1
)
call :log_end "PHASE2 find npm"

call :log_begin "PHASE2 venv create"
if not exist "%VENV_PY%" (
  echo [SETUP] Creating backend virtual environment...
  %PYTHON_CMD% -m venv "%VENV%"
  if errorlevel 1 (
    echo [ERROR] Failed to create venv.
    exit /b 1
  )
)
call :log_end "PHASE2 venv create"

call :log_begin "PHASE2 pip install"
"%VENV_PY%" -c "import fastapi, uvicorn, sqlalchemy, dotenv, psycopg2, sklearn, numpy, joblib, pytest" >nul 2>&1
if errorlevel 1 (
  echo [SETUP] Installing backend requirements...
  "%VENV_PIP%" install -r "%BACKEND%\requirements.txt" >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] pip install failed.
    exit /b 1
  )
)
call :log_end "PHASE2 pip install"

if not exist "%BACKEND_ENV%" (
  echo [SETUP] Creating backend\.env ...
  (
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=personalized_learning_system
    echo DB_USER=postgres
    echo DB_PASSWORD=postgres
    echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personalized_learning_system
  ) > "%BACKEND_ENV%"
)

if not exist "%ML_STORAGE%\" mkdir "%ML_STORAGE%"
echo [OK] PHASE 2 complete.

REM ============================================================================
echo [PHASE 3] PostgreSQL verification
REM ============================================================================
call :log_begin "PHASE3 postgres service"
call :check_postgres_service
if errorlevel 1 exit /b 1
call :log_end "PHASE3 postgres service"

call :log_begin "PHASE3 postgres port listen"
call :wait_for_port_listen %POSTGRES_PORT% 20
if errorlevel 1 (
  echo [ERROR] PostgreSQL not listening on port %POSTGRES_PORT% within timeout.
  exit /b 1
)
call :log_end "PHASE3 postgres port listen"

call :log_begin "PHASE3 postgres db login"
pushd "%BACKEND%"
"%VENV_PY%" scripts\launcher_db_check.py
if errorlevel 1 (
  popd
  echo [ERROR] PostgreSQL connection failed - check DB settings in backend/.env
  exit /b 1
)
popd
call :log_end "PHASE3 postgres db login"

call :log_begin "PHASE3 seed data"
pushd "%BACKEND%"
"%VENV_PY%" app\seed_data.py
if errorlevel 1 (
  popd
  echo [ERROR] Database seed failed.
  exit /b 1
)
popd
call :log_end "PHASE3 seed data"
echo [OK] PHASE 3 complete.

REM ============================================================================
echo [PHASE 4] Backend startup
REM ============================================================================
if not exist "%FRONTEND%\node_modules\" (
  call :log_begin "PHASE4 npm install"
  pushd "%FRONTEND%"
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] npm install failed.
    exit /b 1
  )
  popd
  call :log_end "PHASE4 npm install"
)

call :log_begin "PHASE4 start uvicorn"
echo [START] Backend API on port %BACKEND_PORT%...
start "PLS-Backend" /D "%BACKEND%" cmd /k ""%VENV_PY%" -m uvicorn app.main:app --host 127.0.0.1 --port %BACKEND_PORT%"
call :log_end "PHASE4 start uvicorn"

call :log_begin "PHASE4 health check"
call :wait_for_http "%BACKEND_URL%/health" 35 5
if errorlevel 1 (
  echo [ERROR] Backend /health failed within timeout. See PLS-Backend window.
  exit /b 1
)
call :log_end "PHASE4 health check"
echo [OK] PHASE 4 complete - %BACKEND_URL%/health

REM ============================================================================
echo [PHASE 5] ML initialization
REM ============================================================================
call :log_begin "PHASE5 ml train"
call :http_post "%BACKEND_URL%/api/ml/train" 25 15
if errorlevel 1 (
  echo [ERROR] POST /api/ml/train failed or timed out.
  exit /b 1
)
call :log_end "PHASE5 ml train"

call :log_begin "PHASE5 ml status"
call :wait_for_http "%BACKEND_URL%/api/ml/status" 15 5
if errorlevel 1 (
  echo [ERROR] GET /api/ml/status failed.
  exit /b 1
)
call :log_end "PHASE5 ml status"

call :log_begin "PHASE5 ml predict"
call :verify_ml_predict
if errorlevel 1 (
  echo [ERROR] POST /api/ml/predict verification failed.
  exit /b 1
)
call :log_end "PHASE5 ml predict"
echo [OK] PHASE 5 complete.

REM ============================================================================
echo [PHASE 6] Frontend startup
REM ============================================================================
call :log_begin "PHASE6 start vite"
echo [START] Frontend on port %FRONTEND_PORT%...
start "PLS-Frontend" /D "%FRONTEND%" cmd /k "npm run dev -- --host 127.0.0.1 --port %FRONTEND_PORT%"
call :log_end "PHASE6 start vite"

call :log_begin "PHASE6 frontend port"
call :wait_for_port_listen %FRONTEND_PORT% 30
if errorlevel 1 (
  echo [ERROR] Frontend did not open port %FRONTEND_PORT% in time.
  exit /b 1
)
call :log_end "PHASE6 frontend port"

call :log_begin "PHASE6 frontend http"
call :wait_for_http "%FRONTEND_URL%" 25 5
if errorlevel 1 (
  echo [WARN] Frontend HTTP check failed; port is open - Vite may still compile.
) else (
  echo [OK] Frontend HTTP responded.
)
call :log_end "PHASE6 frontend http"
echo [OK] PHASE 6 complete.

REM ============================================================================
echo [PHASE 7] Final verification
REM ============================================================================
call :log_begin "PHASE7 open browser"
start "" "%FRONTEND_URL%"
call :log_end "PHASE7 open browser"

echo.
echo ============================================================
echo   Project started successfully.
echo   Backend:  %BACKEND_URL%
echo   Frontend: %FRONTEND_URL%
echo   ML:       %BACKEND_URL%/api/ml/status
if exist "%ML_MODEL%" (
  echo   Model:    %ML_MODEL%
) else (
  echo   Model:    not saved yet - needs quiz data
)
echo   Stop:     stop_project.bat
echo ============================================================
echo.
exit /b 0

REM --- helpers ---

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
  echo [CLEANUP] Killing !LABEL! PID %%a on port %~1...
  taskkill /F /PID %%a >nul 2>&1
)
if "!FOUND!"=="0" echo [CLEANUP] No listener on port %~1.
exit /b 0

:wait_for_port_free
set "WP_PORT=%~1"
set /a "WP_RETRIES=%~2"
:wp_free_loop
call :log_begin "port_free check !WP_PORT! attempt"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action PortListening -Port !WP_PORT! -TimeoutSec 3 >nul 2>&1
set "LISTEN_RC=!ERRORLEVEL!"
call :log_end "port_free check !WP_PORT!"
if !LISTEN_RC! NEQ 0 exit /b 0
set /a WP_RETRIES-=1
if !WP_RETRIES! LEQ 0 (
  echo [ERROR] Port !WP_PORT! still listening after retries.
  exit /b 1
)
ping 127.0.0.1 -n 2 >nul
goto :wp_free_loop

:wait_for_port_listen
set "WL_PORT=%~1"
set /a "WL_RETRIES=%~2"
:wp_listen_loop
call :log_begin "port_listen check !WL_PORT!"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action PortListening -Port !WL_PORT! -TimeoutSec 3 >nul 2>&1
set "LISTEN_RC=!ERRORLEVEL!"
call :log_end "port_listen check !WL_PORT!"
if !LISTEN_RC! EQU 0 exit /b 0
set /a WL_RETRIES-=1
if !WL_RETRIES! LEQ 0 exit /b 1
ping 127.0.0.1 -n 2 >nul
goto :wp_listen_loop

:wait_for_http
set "HTTP_URL=%~1"
set /a "HTTP_RETRIES=%~2"
set "HTTP_TIMEOUT=%~3"
if not defined HTTP_TIMEOUT set "HTTP_TIMEOUT=5"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action HttpGet -Url "!HTTP_URL!" -TimeoutSec !HTTP_TIMEOUT! -Retries !HTTP_RETRIES!
exit /b !ERRORLEVEL!

:http_post
set "POST_URL=%~1"
set /a "POST_RETRIES=%~2"
set "POST_TIMEOUT=%~3"
if not defined POST_TIMEOUT set "POST_TIMEOUT=15"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action HttpPost -Url "!POST_URL!" -TimeoutSec !POST_TIMEOUT! -Retries !POST_RETRIES!
exit /b !ERRORLEVEL!

:verify_ml_predict
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action MlPredict -BaseUrl "%BACKEND_URL%" -ProbeName "%ML_PROBE_STUDENT%" -TimeoutSec 20
exit /b !ERRORLEVEL!

:check_postgres_service
call :log_begin "postgres Get-Service"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_UTIL%" -Action PostgresService -TimeoutSec 8 >nul 2>&1
set "PGSVC_RC=!ERRORLEVEL!"
call :log_end "postgres Get-Service"
if !PGSVC_RC! EQU 3 (
  echo [WARN] PostgreSQL service not found by name; using port/login checks.
  exit /b 0
)
if !PGSVC_RC! EQU 4 (
  echo [WARN] PostgreSQL service check timed out; using port/login checks.
  exit /b 0
)
if !PGSVC_RC! EQU 2 (
  echo [ERROR] PostgreSQL service exists but is not running.
  exit /b 1
)
if !PGSVC_RC! NEQ 0 (
  echo [WARN] PostgreSQL service check returned !PGSVC_RC!; continuing.
)
echo [OK] PostgreSQL service check passed.
exit /b 0
