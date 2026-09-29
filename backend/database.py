import sqlite3
import os
import hashlib
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "control_ventas.db")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
ARTICULOS_DIR = os.path.join(UPLOADS_DIR, "articulos")
COMPROBANTES_DIR = os.path.join(UPLOADS_DIR, "comprobantes")

os.makedirs(ARTICULOS_DIR, exist_ok=True)
os.makedirs(COMPROBANTES_DIR, exist_ok=True)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

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

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Usuarios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nombre TEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cursor.execute("SELECT id FROM usuarios WHERE usuario = 'admin'")
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO usuarios (usuario, password_hash, nombre)
            VALUES ('admin', ?, 'Administrador')
            """, (hash_password('1234'),))

        # Productos
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            detalles_incluye TEXT,
            foto_url TEXT,
            costo_usd REAL DEFAULT 0.0,
            precio_sugerido_gtq REAL DEFAULT 0.0,
            stock INTEGER DEFAULT 1,
            categoria TEXT DEFAULT 'Consolas & Videojuegos',
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Ventas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Items de venta
        cursor.execute("""
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
        )
        """)

        # Abonos (con soporte para saber quién de los hermanos recibió el dinero)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS abonos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id INTEGER NOT NULL,
            monto_gtq REAL NOT NULL,
            fecha_abono TEXT NOT NULL,
            metodo_pago TEXT DEFAULT 'Efectivo',
            recibido_por TEXT DEFAULT 'Hermano 1', -- Quién de los 2 hermanos tiene el dinero
            numero_boleta TEXT,
            foto_comprobante TEXT,
            nota TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
        )
        """)

        # Migración segura
        cols_abonos = [row["name"] for row in cursor.execute("PRAGMA table_info(abonos)").fetchall()]
        if "recibido_por" not in cols_abonos:
            cursor.execute("ALTER TABLE abonos ADD COLUMN recibido_por TEXT DEFAULT 'Hermano 1'")

        # Configuración
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL
        )
        """)

        cursor.execute("INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('tasa_cambio', '7.80')")
        cursor.execute("INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('nombre_negocio', 'Control de Ventas')")
        cursor.execute("INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('dias_alerta_atraso', '20')")
        cursor.execute("INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('socio_1', 'Hermano 1')")
        cursor.execute("INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('socio_2', 'Hermano 2')")
