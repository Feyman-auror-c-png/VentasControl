@echo off
title Control de Ventas y Fiados
cd /d "%~dp0"

echo ======================================================
echo    INICIANDO CONTROL DE VENTAS Y FIADOS (HERMANOS)
echo ======================================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [!] No se encontro el entorno virtual .venv. Creandolo...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

echo [*] Obteniendo direccion IP local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found_ip
)
:found_ip
echo.
echo ======================================================
echo   APP LISTA Y FUNCIONANDO!
echo.
echo   - Desde esta PC abre:     http://localhost:8000
echo   - Desde tu celular abre:   http://%IP: =%:8000
echo ======================================================
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
