#!/bin/bash
# Script de inicio para servidor Ubuntu
cd "$(dirname "$0")"

echo "======================================================"
echo "   INICIANDO CONTROL DE VENTAS Y FIADOS EN UBUNTU"
echo "======================================================"

if [ ! -d ".venv" ]; then
    echo "[*] Creando entorno virtual .venv..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

IP_LOCAL=$(hostname -I | awk '{print $1}')
echo ""
echo "App corriendo en:"
echo " - Local:   http://localhost:8000"
echo " - Celular: http://$IP_LOCAL:8000"
echo ""

uvicorn backend.main:app --host 0.0.0.0 --port 8000
