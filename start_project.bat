@echo off
REM ============================================================================
REM  Personalized Learning System - Start Launcher (Windows)
REM  Starts backend (FastAPI) and frontend (Vite), then opens the app in browser.
REM ============================================================================

setlocal EnableDelayedExpansion

REM Project root = folder containing this script
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

REM --- Backend: create virtual environment if missing -----------------------
if not exist "%VENV_PY%" (
  echo [SETUP] Creating backend virtual environment...
  %PYTHON_CMD% -m venv "%VENV%"
  if errorlevel 1 (
    echo [ERROR] Failed to create venv at %VENV%
    pause
    exit /b 1
  )
  echo [OK] Virtual environment created.
)

REM --- Backend: install requirements if packages missing ----------------------
"%VENV_PY%" -c "import uvicorn, fastapi" >nul 2>&1
if errorlevel 1 (
  echo [SETUP] Installing backend packages from requirements.txt...
  "%VENV_PIP%" install -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo [ERROR] pip install failed.
    pause
    exit /b 1
  )
  echo [OK] Backend dependencies installed.
)

REM --- Frontend: npm install if node_modules missing --------------------------
if not exist "%FRONTEND%\node_modules\" (
  echo [SETUP] Installing frontend packages - npm install...
  where npm >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js and add it to PATH.
    pause
    exit /b 1
  )
  pushd "%FRONTEND%"
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  popd
  echo [OK] Frontend dependencies installed.
)

REM --- Warn if ports already in use -------------------------------------------
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [WARN] Port 8000 is already in use. Backend may fail to start.
  echo        Run stop_project.bat first if you want a clean restart.
)
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [WARN] Port 5173 is already in use. Frontend may fail to start.
  echo        Run stop_project.bat first if you want a clean restart.
)

REM --- Start backend in a new terminal window ---------------------------------
echo [START] Backend API on port 8000...
start "PLS-Backend" /D "%BACKEND%" cmd /k call "%VENV%\Scripts\activate.bat" ^&^& echo Backend: %BACKEND_URL% ^&^& python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

REM --- Start frontend in a new terminal window --------------------------------
echo [START] Frontend dev server on port 5173...
start "PLS-Frontend" /D "%FRONTEND%" cmd /k echo Frontend: %FRONTEND_URL% ^&^& npm run dev -- --host 127.0.0.1 --port 5173

REM --- Wait for servers, then open browser ------------------------------------
echo [WAIT] Waiting for servers to start...
REM Use ping instead of timeout - works when stdin is redirected
ping 127.0.0.1 -n 6 >nul

echo [OPEN] Launching browser at %FRONTEND_URL%
start "" "%FRONTEND_URL%"

echo.
echo ============================================================
echo   Project started successfully.
echo   Backend:  %BACKEND_URL%  (API docs: %BACKEND_URL%/docs)
echo   Frontend: %FRONTEND_URL%
echo.
echo   Close the PLS-Backend and PLS-Frontend windows to stop,
echo   or run stop_project.bat from the project root.
echo ============================================================
echo.

endlocal
