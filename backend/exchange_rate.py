import time

import requests

from .database import get_db


_cached_online_rate = None
_last_fetch = 0


def get_current_rate(workspace_id: int) -> float:
    global _cached_online_rate, _last_fetch
    now = time.time()
    if _cached_online_rate is not None and now - _last_fetch < 3600:
        return _cached_online_rate

    try:
        resp = requests.get("https://open.er-api.com/v6/latest/USD", timeout=5)
        if resp.status_code == 200:
            gtq_rate = resp.json().get("rates", {}).get("GTQ")
            if gtq_rate and gtq_rate > 0:
                _cached_online_rate = round(float(gtq_rate), 2)
                _last_fetch = now
                return _cached_online_rate
    except Exception:
        pass

    with get_db() as conn:
        row = conn.execute(
            "SELECT valor FROM configuracion WHERE workspace_id = ? AND clave = 'tasa_cambio'",
            (workspace_id,),
        ).fetchone()
    try:
        return float(row["valor"]) if row else 7.80
    except (ValueError, TypeError):
        return 7.80


def set_manual_rate(workspace_id: int, new_rate: float):
    value = round(float(new_rate), 2)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO configuracion (workspace_id, clave, valor) VALUES (?, 'tasa_cambio', ?)
            ON CONFLICT(workspace_id, clave) DO UPDATE SET valor = excluded.valor
            """,
            (workspace_id, str(value)),
        )
    return value
