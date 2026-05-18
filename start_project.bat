@echo off
REM ============================================================================
REM  Personalized Learning System - Start Launcher (Windows)
REM  Starts backend FastAPI and frontend Vite automatically.
REM ============================================================================

setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\venv"
set "VENV_PY=%VENV%\Scripts\python.exe"
set "VENV_PIP=%VENV%\Scripts\pip.exe"
set "BACKEND_URL=http://127.0.0.1:8000"
set "FRONTEND_URL=http://127.0.0.1:5173"

echo.
echo ============================================================
echo   Personalized Learning System - Starting...
echo ============================================================
echo.

REM --- Clean old backend/frontend processes -----------------------------------
echo [CLEANUP] Checking old backend/frontend ports...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
  echo [CLEANUP] Killing old backend PID %%a...
  taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
  echo [CLEANUP] Killing old frontend PID %%a...
  taskkill /F /PID %%a >nul 2>&1
)

taskkill /FI "WINDOWTITLE eq PLS-Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PLS-Frontend*" /T /F >nul 2>&1

ping 127.0.0.1 -n 3 >nul

REM --- Resolve Python command -------------------------------------------------
set "PYTHON_CMD=python"
where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
  )
  set "PYTHON_CMD=py -3"
)

REM --- Check npm --------------------------------------------------------------
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js and add it to PATH.
  pause
  exit /b 1
)

REM --- Backend: create virtual environment if missing -------------------------
if not exist "%VENV_PY%" (
  echo [SETUP] Creating backend virtual environment...
  %PYTHON_CMD% -m venv "%VENV%"
  if errorlevel 1 (
    echo [ERROR] Failed to create backend virtual environment.
    pause
    exit /b 1
  )
  echo [OK] Virtual environment created.
)

REM --- Backend: install requirements if missing -------------------------------
"%VENV_PY%" -c "import uvicorn, fastapi" >nul 2>&1
if errorlevel 1 (
  echo [SETUP] Installing backend requirements...
  "%VENV_PIP%" install -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
  )
  echo [OK] Backend dependencies installed.
)

REM --- Backend: seed database if needed ---------------------------------------
if not exist "%BACKEND%\learning_system.db" (
  echo [SETUP] Creating and seeding database...
  pushd "%BACKEND%"
  "%VENV_PY%" app\seed_data.py
  popd
)

REM --- Frontend: install packages if missing ----------------------------------
if not exist "%FRONTEND%\node_modules\" (
  echo [SETUP] Installing frontend dependencies...
  pushd "%FRONTEND%"
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b 1
  )
  popd
  echo [OK] Frontend dependencies installed.
)

REM --- Start backend ----------------------------------------------------------
echo [START] Backend API on port 8000...
start "PLS-Backend" /D "%BACKEND%" cmd /k call "%VENV%\Scripts\activate.bat" ^&^& echo Backend: %BACKEND_URL% ^&^& python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

REM --- Start frontend ---------------------------------------------------------
echo [START] Frontend dev server on port 5173...
start "PLS-Frontend" /D "%FRONTEND%" cmd /k echo Frontend: %FRONTEND_URL% ^&^& npm run dev -- --host 127.0.0.1 --port 5173

REM --- Wait and open browser --------------------------------------------------
echo [WAIT] Waiting for servers to start...
ping 127.0.0.1 -n 6 >nul

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

endlocal