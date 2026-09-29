import hashlib
import os
import sqlite3
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get("VENTAS_DB_PATH", os.path.join(BASE_DIR, "control_ventas.db"))
UPLOADS_DIR = os.environ.get("VENTAS_UPLOADS_DIR", os.path.join(BASE_DIR, "uploads"))
ARTICULOS_DIR = os.path.join(UPLOADS_DIR, "articulos")
COMPROBANTES_DIR = os.path.join(UPLOADS_DIR, "comprobantes")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(ARTICULOS_DIR, exist_ok=True)
os.makedirs(COMPROBANTES_DIR, exist_ok=True)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_workspace_config(cursor, workspace_id: int, socio_1: str, socio_2: str):
    defaults = {
        "tasa_cambio": "7.80",
        "nombre_negocio": "Control de Ventas",
        "dias_alerta_atraso": "20",
        "socio_1": socio_1,
        "socio_2": socio_2,
    }
    for clave, valor in defaults.items():
        cursor.execute(
            "INSERT OR IGNORE INTO configuracion (workspace_id, clave, valor) VALUES (?, ?, ?)",
            (workspace_id, clave, valor),
        )


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                usuario TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nombre TEXT NOT NULL,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS sesiones (
                token_hash TEXT PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                expira_en DATETIME NOT NULL,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                detalles_incluye TEXT,
                foto_url TEXT,
                costo_usd REAL DEFAULT 0.0,
                precio_sugerido_gtq REAL DEFAULT 0.0,
                stock INTEGER DEFAULT 1,
                categoria TEXT DEFAULT 'Consolas & Videojuegos',
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                comprador_nombre TEXT NOT NULL,
                comprador_telefono TEXT,
                fecha_venta TEXT NOT NULL,
                dia_pago_mes INTEGER DEFAULT 15,
                proxima_fecha_pago TEXT,
                total_gtq REAL NOT NULL,
                costo_total_usd REAL DEFAULT 0.0,
                tasa_cambio_aplicada REAL DEFAULT 7.80,
                meses_estimados INTEGER DEFAULT 0,
                foto_articulo TEXT,
                detalles_entrega TEXT,
                notas TEXT,
                estado TEXT DEFAULT 'activa',
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS venta_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL,
                producto_id INTEGER,
                descripcion TEXT NOT NULL,
                cantidad INTEGER DEFAULT 1,
                precio_unitario_gtq REAL NOT NULL,
                costo_unitario_usd REAL DEFAULT 0.0,
                FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS abonos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL,
                monto_gtq REAL NOT NULL,
                fecha_abono TEXT NOT NULL,
                metodo_pago TEXT DEFAULT 'Efectivo',
                recibido_por TEXT DEFAULT 'Hermano 1',
                numero_boleta TEXT,
                foto_comprobante TEXT,
                nota TEXT,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS configuracion (
                workspace_id INTEGER NOT NULL,
                clave TEXT NOT NULL,
                valor TEXT NOT NULL,
                PRIMARY KEY (workspace_id, clave),
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_productos_workspace ON productos(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_ventas_workspace ON ventas(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
            """
        )


def create_user(usuario: str, password: str, nombre: str, workspace_name: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO workspaces (nombre) VALUES (?)", (workspace_name,))
        workspace_id = cursor.execute(
            "SELECT id FROM workspaces WHERE nombre = ?", (workspace_name,)
        ).fetchone()["id"]
        cursor.execute(
            """
            INSERT INTO usuarios (workspace_id, usuario, password_hash, nombre)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(usuario) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                password_hash = excluded.password_hash,
                nombre = excluded.nombre
            """,
            (workspace_id, usuario.strip(), hash_password(password), nombre.strip()),
        )
        socios = ("Jeffre Connor", "Daniel Connor") if workspace_name == "Familia Connor" else ("Testing", "Testing")
        init_workspace_config(cursor, workspace_id, *socios)
