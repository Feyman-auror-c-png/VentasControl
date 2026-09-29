import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .database import get_db


bearer = HTTPBearer(auto_error=False)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(usuario_id: int, remember: bool = True) -> str:
    token = secrets.token_urlsafe(48)
    days = 30 if remember else 1
    expires = datetime.now(timezone.utc) + timedelta(days=days)
    with get_db() as conn:
        conn.execute("DELETE FROM sesiones WHERE expira_en <= ?", (datetime.now(timezone.utc).isoformat(),))
        conn.execute(
            "INSERT INTO sesiones (token_hash, usuario_id, expira_en) VALUES (?, ?, ?)",
            (token_hash(token), usuario_id, expires.isoformat()),
        )
    return token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Sesión requerida")
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.usuario, u.nombre, u.workspace_id, w.nombre AS workspace_nombre
            FROM sesiones s
            JOIN usuarios u ON u.id = s.usuario_id
            JOIN workspaces w ON w.id = u.workspace_id
            WHERE s.token_hash = ? AND s.expira_en > ?
            """,
            (token_hash(credentials.credentials), now),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Sesión inválida o vencida")
    return dict(row)


def delete_session(token: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM sesiones WHERE token_hash = ?", (token_hash(token),))
