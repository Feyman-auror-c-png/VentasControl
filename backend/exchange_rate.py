import requests
import time
from .database import get_db

_cached_rate = None
_last_fetch = 0

def get_current_rate() -> float:
    global _cached_rate, _last_fetch
    now = time.time()
    
    # Cache in-memory for 1 hour to avoid excessive external requests
    if _cached_rate is not None and (now - _last_fetch < 3600):
        return _cached_rate

    # Try fetching online
    try:
        resp = requests.get("https://open.er-api.com/v6/latest/USD", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            rates = data.get("rates", {})
            gtq_rate = rates.get("GTQ")
            if gtq_rate and gtq_rate > 0:
                _cached_rate = round(float(gtq_rate), 2)
                _last_fetch = now
                # Persist in DB
                with get_db() as conn:
                    conn.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('tasa_cambio', ?)", (str(_cached_rate),))
                return _cached_rate
    except Exception:
        pass

    # Fallback to database
    with get_db() as conn:
        row = conn.execute("SELECT valor FROM configuracion WHERE clave = 'tasa_cambio'").fetchone()
        if row and row["valor"]:
            try:
                _cached_rate = float(row["valor"])
                return _cached_rate
            except ValueError:
                pass

    _cached_rate = 7.80
    return _cached_rate

def set_manual_rate(new_rate: float):
    global _cached_rate, _last_fetch
    _cached_rate = round(float(new_rate), 2)
    _last_fetch = time.time()
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('tasa_cambio', ?)", (str(_cached_rate),))
    return _cached_rate
