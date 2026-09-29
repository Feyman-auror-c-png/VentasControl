import os
import shutil
import zipfile
import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .database import (
    init_db, get_db, hash_password,
    BASE_DIR, UPLOADS_DIR, ARTICULOS_DIR, COMPROBANTES_DIR, DB_PATH
)
from .exchange_rate import get_current_rate, set_manual_rate
from .whatsapp_helper import generate_whatsapp_message, get_whatsapp_url

init_db()

app = FastAPI(title="Control de Ventas & Fiados")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- MODELOS PYDANTIC ---

class LoginRequest(BaseModel):
    usuario: str
    password: str

class PasswordChangeRequest(BaseModel):
    usuario: str
    password_actual: str
    nueva_password: str

class ItemVentaInput(BaseModel):
    producto_id: Optional[int] = None
    descripcion: str
    cantidad: int = 1
    precio_unitario_gtq: float
    costo_unitario_usd: float = 0.0

class VentaCreate(BaseModel):
    comprador_nombre: str
    comprador_telefono: Optional[str] = ""
    fecha_venta: Optional[str] = None
    dia_pago_mes: Optional[int] = 15
    items: List[ItemVentaInput]
    total_gtq: float
    costo_total_usd: float = 0.0
    meses_estimados: int = 0
    notas: Optional[str] = ""
    enganche_inicial: float = 0.0
    recibido_por: Optional[str] = "Hermano 1"
    foto_articulo: Optional[str] = ""
    detalles_entrega: Optional[str] = ""

class AbonoCreate(BaseModel):
    monto_gtq: float
    fecha_abono: Optional[str] = None
    metodo_pago: Optional[str] = "Efectivo"
    recibido_por: Optional[str] = "Hermano 1"
    numero_boleta: Optional[str] = ""
    foto_comprobante: Optional[str] = ""
    nota: Optional[str] = ""

class ProductoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    detalles_incluye: Optional[str] = ""
    foto_url: Optional[str] = ""
    costo_usd: float = 0.0
    precio_sugerido_gtq: float = 0.0
    stock: int = 1
    categoria: Optional[str] = "Consolas & Videojuegos"

class ConfigUpdate(BaseModel):
    tasa_cambio: Optional[float] = None
    dias_alerta_atraso: Optional[int] = None
    nombre_negocio: Optional[str] = None
    socio_1: Optional[str] = None
    socio_2: Optional[str] = None

# --- RUTAS DE AUTENTICACIÓN ---

@app.post("/api/auth/login")
def login(req: LoginRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        u = cursor.execute("SELECT * FROM usuarios WHERE usuario = ?", (req.usuario.strip(),)).fetchone()
        if not u or u["password_hash"] != hash_password(req.password):
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
        return {
            "ok": True,
            "usuario": u["usuario"],
            "nombre": u["nombre"],
            "token": f"session_{u['id']}_{hash_password(u['password_hash'])[:16]}"
        }

@app.post("/api/auth/change-password")
def change_password(req: PasswordChangeRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        u = cursor.execute("SELECT * FROM usuarios WHERE usuario = ?", (req.usuario.strip(),)).fetchone()
        if not u or u["password_hash"] != hash_password(req.password_actual):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        if len(req.nueva_password) < 4:
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres")
        cursor.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", (hash_password(req.nueva_password), u["id"]))
        return {"ok": True, "mensaje": "Contraseña actualizada exitosamente"}

# --- SUBIDA DE ARCHIVOS ---

@app.post("/api/upload/articulo")
async def upload_articulo(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".heic"]:
        ext = ".jpg"
    filename = f"art_{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(ARTICULOS_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"ok": True, "url": f"/uploads/articulos/{filename}"}

@app.post("/api/upload/articulos")
async def upload_articulos(files: List[UploadFile] = File(...)):
    urls = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".heic"]:
            ext = ".jpg"
        filename = f"art_{uuid.uuid4().hex[:12]}{ext}"
        filepath = os.path.join(ARTICULOS_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        urls.append(f"/uploads/articulos/{filename}")
    return {"ok": True, "urls": urls}

@app.post("/api/upload/comprobante")
async def upload_comprobante(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".heic"]:
        ext = ".jpg"
    filename = f"comp_{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(COMPROBANTES_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"ok": True, "url": f"/uploads/comprobantes/{filename}"}

# --- RESPALDO ---

@app.get("/api/backup/download")
def download_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"respaldo_ventas_{timestamp}.zip"
    zip_path = os.path.join(BASE_DIR, zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(DB_PATH):
            zipf.write(DB_PATH, arcname="control_ventas.db")
        if os.path.exists(UPLOADS_DIR):
            for root, dirs, files in os.walk(UPLOADS_DIR):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, BASE_DIR)
                    zipf.write(full_path, arcname=rel_path)

    return FileResponse(zip_path, filename=zip_filename, media_type="application/zip")

# --- DASHBOARD & BALANCE ENTRE HERMANOS ---

@app.get("/api/dashboard")
def get_dashboard():
    tasa = get_current_rate()
    today = date.today()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cfg_rows = {r["clave"]: r["valor"] for r in cursor.execute("SELECT clave, valor FROM configuracion").fetchall()}
        dias_alerta = int(cfg_rows.get("dias_alerta_atraso", 20))
        socio_1 = cfg_rows.get("socio_1", "Hermano 1")
        socio_2 = cfg_rows.get("socio_2", "Hermano 2")

        ventas_raw = cursor.execute("""
            SELECT v.*, 
                   COALESCE(SUM(a.monto_gtq), 0) as total_abonado,
                   MAX(a.fecha_abono) as ultimo_abono_fecha
            FROM ventas v
            LEFT JOIN abonos a ON v.id = a.venta_id
            WHERE v.estado != 'anulada'
            GROUP BY v.id
        """).fetchall()

        total_ventas_gtq = 0.0
        total_cobrado_gtq = 0.0
        total_por_cobrar_gtq = 0.0
        costo_total_gtq = 0.0
        ventas_activas_count = 0
        ventas_atrasadas_count = 0

        for r in ventas_raw:
            v_total = float(r["total_gtq"])
            v_abonado = float(r["total_abonado"])
            v_saldo = max(0.0, v_total - v_abonado)
            v_costo_usd = float(r["costo_total_usd"])
            v_costo_gtq = v_costo_usd * float(r["tasa_cambio_aplicada"] or tasa)

            total_ventas_gtq += v_total
            total_cobrado_gtq += v_abonado
            costo_total_gtq += v_costo_gtq

            if r["estado"] == "activa" and v_saldo > 0:
                ventas_activas_count += 1
                total_por_cobrar_gtq += v_saldo
                
                fecha_ref_str = r["ultimo_abono_fecha"] or r["fecha_venta"]
                try:
                    fecha_ref = datetime.strptime(fecha_ref_str[:10], "%Y-%m-%d").date()
                    dias_pasados = (today - fecha_ref).days
                    if dias_pasados >= dias_alerta:
                        ventas_atrasadas_count += 1
                except Exception:
                    pass

        ganancia_neta_estimada = total_ventas_gtq - costo_total_gtq

        # Balance entre Hermanos (Quién tiene el dinero cobrado)
        abonos_all = cursor.execute("SELECT monto_gtq, recibido_por FROM abonos").fetchall()
        cobrado_socio_1 = 0.0
        cobrado_socio_2 = 0.0

        for ab in abonos_all:
            m = float(ab["monto_gtq"])
            rec = ab["recibido_por"] or socio_1
            if rec == socio_2:
                cobrado_socio_2 += m
            else:
                cobrado_socio_1 += m

        # Diferencia entre ambos (para quedar 50/50 del dinero en mano)
        mitad_cobrado = total_cobrado_gtq / 2.0
        diferencia = round(cobrado_socio_1 - cobrado_socio_2, 2)
        debe_pasar = round(abs(diferencia) / 2.0, 2)
        
        ajuste_texto = "Están exactamente tablas (50% cada uno)."
        if diferencia > 0.01:
            ajuste_texto = f"{socio_1} tiene más cobrado. Debe transferir Q{debe_pasar:,.2f} a {socio_2} para quedar 50/50."
        elif diferencia < -0.01:
            ajuste_texto = f"{socio_2} tiene más cobrado. Debe transferir Q{debe_pasar:,.2f} a {socio_1} para quedar 50/50."

        return {
            "tasa_cambio": tasa,
            "dias_alerta": dias_alerta,
            "total_ventas_gtq": round(total_ventas_gtq, 2),
            "total_cobrado_gtq": round(total_cobrado_gtq, 2),
            "total_por_cobrar_gtq": round(total_por_cobrar_gtq, 2),
            "costo_total_gtq": round(costo_total_gtq, 2),
            "ganancia_neta_estimada_gtq": round(ganancia_neta_estimada, 2),
            "ventas_activas_count": ventas_activas_count,
            "ventas_atrasadas_count": ventas_atrasadas_count,
            # Balance de socios
            "socio_1": socio_1,
            "socio_2": socio_2,
            "cobrado_socio_1": round(cobrado_socio_1, 2),
            "cobrado_socio_2": round(cobrado_socio_2, 2),
            "ajuste_texto": ajuste_texto
        }

# --- VENTAS CRUD ---

@app.get("/api/ventas")
def listar_ventas(estado: Optional[str] = None, q: Optional[str] = None):
    tasa = get_current_rate()
    today = date.today()
    mes_actual_prefijo = today.strftime("%Y-%m")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cfg_row = cursor.execute("SELECT valor FROM configuracion WHERE clave = 'dias_alerta_atraso'").fetchone()
        dias_alerta = int(cfg_row["valor"]) if cfg_row else 20

        query = """
            SELECT v.*, 
                   COALESCE(SUM(a.monto_gtq), 0) as total_abonado,
                   MAX(a.fecha_abono) as ultimo_abono_fecha
            FROM ventas v
            LEFT JOIN abonos a ON v.id = a.venta_id
            WHERE 1=1
        """
        params = []
        if estado:
            query += " AND v.estado = ?"
            params.append(estado)
        if q:
            query += " AND (v.comprador_nombre LIKE ? OR v.comprador_telefono LIKE ? OR v.detalles_entrega LIKE ? OR v.notas LIKE ?)"
            term = f"%{q}%"
            params.extend([term, term, term, term])

        query += " GROUP BY v.id ORDER BY v.id DESC"
        filas = cursor.execute(query, params).fetchall()

        resultado = []
        for r in filas:
            v_id = r["id"]
            items_raw = cursor.execute("SELECT * FROM venta_items WHERE venta_id = ?", (v_id,)).fetchall()
            items = [dict(it) for it in items_raw]
            
            abonos_raw = cursor.execute("SELECT * FROM abonos WHERE venta_id = ? ORDER BY id ASC", (v_id,)).fetchall()
            abonos = [dict(ab) for ab in abonos_raw]

            v_total = float(r["total_gtq"])
            v_abonado = float(r["total_abonado"])
            v_saldo = max(0.0, round(v_total - v_abonado, 2))
            porcentaje_pagado = round((v_abonado / v_total * 100), 1) if v_total > 0 else 100

            fecha_ref_str = r["ultimo_abono_fecha"] or r["fecha_venta"]
            dias_inactivo = 0
            try:
                fecha_ref = datetime.strptime(fecha_ref_str[:10], "%Y-%m-%d").date()
                dias_inactivo = (today - fecha_ref).days
            except Exception:
                pass

            dia_pago = int(r["dia_pago_mes"] or 15)
            abonos_este_mes = [ab for ab in abonos if (ab["fecha_abono"] or "").startswith(mes_actual_prefijo)]
            monto_abonado_este_mes = sum([float(ab["monto_gtq"]) for ab in abonos_este_mes])
            ha_pagado_este_mes = (monto_abonado_este_mes > 0)
            atrasado_por_fecha_mes = (today.day > dia_pago and not ha_pagado_este_mes)
            esta_atrasado = (r["estado"] == "activa" and v_saldo > 0 and (dias_inactivo >= dias_alerta or atrasado_por_fecha_mes))

            costo_usd = float(r["costo_total_usd"])
            tasa_v = float(r["tasa_cambio_aplicada"] or tasa)
            costo_gtq = costo_usd * tasa_v
            ganancia_gtq = round(v_total - costo_gtq, 2)

            venta_obj = {
                "id": v_id,
                "comprador_nombre": r["comprador_nombre"],
                "comprador_telefono": r["comprador_telefono"] or "",
                "fecha_venta": r["fecha_venta"],
                "dia_pago_mes": dia_pago,
                "ha_pagado_este_mes": ha_pagado_este_mes,
                "monto_abonado_este_mes": monto_abonado_este_mes,
                "total_gtq": v_total,
                "costo_total_usd": costo_usd,
                "tasa_cambio_aplicada": tasa_v,
                "costo_total_gtq": round(costo_gtq, 2),
                "ganancia_gtq": ganancia_gtq,
                "meses_estimados": r["meses_estimados"],
                "foto_articulo": r["foto_articulo"] or "",
                "detalles_entrega": r["detalles_entrega"] or "",
                "notas": r["notas"] or "",
                "estado": r["estado"],
                "total_abonado": v_abonado,
                "saldo_pendiente": v_saldo,
                "porcentaje_pagado": porcentaje_pagado,
                "ultimo_abono_fecha": r["ultimo_abono_fecha"],
                "dias_inactivo": dias_inactivo,
                "esta_atrasado": esta_atrasado,
                "atrasado_por_fecha_mes": atrasado_por_fecha_mes,
                "items": items,
                "abonos": abonos
            }

            msg_resumen = generate_whatsapp_message("resumen", venta_obj)
            msg_recordatorio = generate_whatsapp_message("recordatorio", venta_obj)
            venta_obj["wa_url_resumen"] = get_whatsapp_url(r["comprador_telefono"], msg_resumen)
            venta_obj["wa_url_recordatorio"] = get_whatsapp_url(r["comprador_telefono"], msg_recordatorio)

            resultado.append(venta_obj)

        return resultado

@app.post("/api/ventas")
def crear_venta(data: VentaCreate):
    tasa = get_current_rate()
    fecha_venta = data.fecha_venta or date.today().strftime("%Y-%m-%d")

    with get_db() as conn:
        cursor = conn.cursor()
        
        foto_final = data.foto_articulo or ""
        detalles_final = data.detalles_entrega or ""
        
        for it in data.items:
            if it.producto_id:
                p_row = cursor.execute("SELECT foto_url, detalles_incluye FROM productos WHERE id = ?", (it.producto_id,)).fetchone()
                if p_row:
                    if not foto_final and p_row["foto_url"]:
                        foto_final = p_row["foto_url"]
                    if not detalles_final and p_row["detalles_incluye"]:
                        detalles_final = p_row["detalles_incluye"]

        cursor.execute("""
            INSERT INTO ventas (
                comprador_nombre, comprador_telefono, fecha_venta, dia_pago_mes,
                total_gtq, costo_total_usd, tasa_cambio_aplicada, meses_estimados,
                foto_articulo, detalles_entrega, notas, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa')
        """, (
            data.comprador_nombre.strip(),
            data.comprador_telefono.strip() if data.comprador_telefono else "",
            fecha_venta,
            data.dia_pago_mes or 15,
            data.total_gtq,
            data.costo_total_usd,
            tasa,
            data.meses_estimados,
            foto_final,
            detalles_final,
            data.notas.strip() if data.notas else ""
        ))
        venta_id = cursor.lastrowid

        for it in data.items:
            cursor.execute("""
                INSERT INTO venta_items (
                    venta_id, producto_id, descripcion, cantidad, precio_unitario_gtq, costo_unitario_usd
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                venta_id,
                it.producto_id,
                it.descripcion.strip(),
                it.cantidad,
                it.precio_unitario_gtq,
                it.costo_unitario_usd
            ))
            if it.producto_id:
                cursor.execute("UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?", (it.cantidad, it.producto_id))

        if data.enganche_inicial > 0:
            cursor.execute("""
                INSERT INTO abonos (venta_id, monto_gtq, fecha_abono, metodo_pago, recibido_por, nota)
                VALUES (?, ?, ?, 'Efectivo', ?, 'Enganche / Pago Inicial')
            """, (venta_id, data.enganche_inicial, fecha_venta, data.recibido_por or "Hermano 1"))

            if data.enganche_inicial >= data.total_gtq:
                cursor.execute("UPDATE ventas SET estado = 'completada' WHERE id = ?", (venta_id,))

        return {"ok": True, "venta_id": venta_id, "mensaje": "Venta registrada con éxito"}

@app.get("/api/ventas/{venta_id}")
def obtener_venta(venta_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        r = cursor.execute("""
            SELECT v.*,
                   COALESCE(SUM(a.monto_gtq), 0.0) as total_abonado,
                   MAX(a.fecha_abono) as ultimo_abono_fecha
            FROM ventas v
            LEFT JOIN abonos a ON v.id = a.venta_id
            WHERE v.id = ?
            GROUP BY v.id
        """, (venta_id,)).fetchone()

        if not r:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        items_raw = cursor.execute("SELECT * FROM venta_items WHERE venta_id = ?", (venta_id,)).fetchall()
        items = [dict(it) for it in items_raw]
        
        abonos_raw = cursor.execute("SELECT * FROM abonos WHERE venta_id = ? ORDER BY id DESC", (venta_id,)).fetchall()
        abonos = [dict(ab) for ab in abonos_raw]

        v_total = float(r["total_gtq"])
        v_abonado = float(r["total_abonado"])
        v_saldo = max(0.0, round(v_total - v_abonado, 2))
        porcentaje_pagado = round((v_abonado / v_total * 100), 1) if v_total > 0 else 100

        dia_pago = int(r["dia_pago_mes"] or 15)

        venta_obj = {
            "id": r["id"],
            "comprador_nombre": r["comprador_nombre"],
            "comprador_telefono": r["comprador_telefono"] or "",
            "fecha_venta": r["fecha_venta"],
            "dia_pago_mes": dia_pago,
            "total_gtq": v_total,
            "costo_total_usd": float(r["costo_total_usd"] or 0),
            "foto_articulo": r["foto_articulo"] or "",
            "detalles_entrega": r["detalles_entrega"] or "",
            "notas": r["notas"] or "",
            "estado": r["estado"],
            "total_abonado": v_abonado,
            "saldo_pendiente": v_saldo,
            "porcentaje_pagado": porcentaje_pagado,
            "items": items,
            "abonos": abonos
        }
        return venta_obj

@app.delete("/api/ventas/{venta_id}")
def eliminar_venta(venta_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        v = cursor.execute("SELECT id FROM ventas WHERE id = ?", (venta_id,)).fetchone()
        if not v:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        cursor.execute("DELETE FROM ventas WHERE id = ?", (venta_id,))
    return {"ok": True, "mensaje": "Venta eliminada correctamente"}

# --- ABONOS ---

@app.post("/api/ventas/{venta_id}/abonos")
def registrar_abono(venta_id: int, abono: AbonoCreate):
    fecha = abono.fecha_abono or date.today().strftime("%Y-%m-%d")
    
    with get_db() as conn:
        cursor = conn.cursor()
        v = cursor.execute("SELECT * FROM ventas WHERE id = ?", (venta_id,)).fetchone()
        if not v:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        cursor.execute("""
            INSERT INTO abonos (venta_id, monto_gtq, fecha_abono, metodo_pago, recibido_por, numero_boleta, foto_comprobante, nota)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            venta_id,
            abono.monto_gtq,
            fecha,
            abono.metodo_pago or "Efectivo",
            abono.recibido_por or "Hermano 1",
            abono.numero_boleta or "",
            abono.foto_comprobante or "",
            abono.nota.strip() if abono.nota else ""
        ))
        abono_id = cursor.lastrowid

        sum_row = cursor.execute("SELECT SUM(monto_gtq) as total_abonado FROM abonos WHERE venta_id = ?", (venta_id,)).fetchone()
        total_abonado = float(sum_row["total_abonado"] or 0.0)
        total_gtq = float(v["total_gtq"])
        saldo = round(total_gtq - total_abonado, 2)

        if saldo <= 0.001:
            cursor.execute("UPDATE ventas SET estado = 'completada' WHERE id = ?", (venta_id,))
        else:
            cursor.execute("UPDATE ventas SET estado = 'activa' WHERE id = ?", (venta_id,))

        items_raw = cursor.execute("SELECT * FROM venta_items WHERE venta_id = ?", (venta_id,)).fetchall()
        items = [dict(it) for it in items_raw]

        venta_dict = dict(v)
        venta_dict["items"] = items
        venta_dict["total_abonado"] = total_abonado
        venta_dict["saldo_pendiente"] = max(0.0, saldo)

        abono_dict = {
            "id": abono_id,
            "monto_gtq": abono.monto_gtq,
            "fecha_abono": fecha,
            "nota": abono.nota
        }

        msg_confirmacion = generate_whatsapp_message("abono_recibido", venta_dict, abono_dict)
        wa_url = get_whatsapp_url(v["comprador_telefono"], msg_confirmacion)

        return {
            "ok": True,
            "abono_id": abono_id,
            "total_abonado": total_abonado,
            "saldo_pendiente": max(0.0, saldo),
            "estado": "completada" if saldo <= 0.001 else "activa",
            "wa_url_confirmacion": wa_url,
            "wa_url_recibo": wa_url,
            "mensaje": "Abono registrado con éxito"
        }

@app.delete("/api/abonos/{abono_id}")
def eliminar_abono(abono_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        ab = cursor.execute("SELECT venta_id FROM abonos WHERE id = ?", (abono_id,)).fetchone()
        if not ab:
            raise HTTPException(status_code=404, detail="Abono no encontrado")
        
        venta_id = ab["venta_id"]
        cursor.execute("DELETE FROM abonos WHERE id = ?", (abono_id,))
        
        v = cursor.execute("SELECT total_gtq FROM ventas WHERE id = ?", (venta_id,)).fetchone()
        sum_row = cursor.execute("SELECT SUM(monto_gtq) as total_abonado FROM abonos WHERE venta_id = ?", (venta_id,)).fetchone()
        total_abonado = float(sum_row["total_abonado"] or 0.0)
        total_gtq = float(v["total_gtq"])
        if total_abonado < total_gtq:
            cursor.execute("UPDATE ventas SET estado = 'activa' WHERE id = ?", (venta_id,))

    return {"ok": True, "mensaje": "Abono eliminado"}

# --- PRODUCTOS / INVENTARIO ---

@app.get("/api/productos")
def listar_productos():
    with get_db() as conn:
        filas = conn.execute("SELECT * FROM productos ORDER BY nombre ASC").fetchall()
        tasa = get_current_rate()
        prods = []
        for r in filas:
            p = dict(r)
            costo_gtq = round(p["costo_usd"] * tasa, 2)
            ganancia_gtq = round(p["precio_sugerido_gtq"] - costo_gtq, 2)
            p["costo_gtq"] = costo_gtq
            p["ganancia_gtq"] = ganancia_gtq
            prods.append(p)
        return prods

@app.get("/api/articulos-vendidos")
def obtener_articulos_vendidos():
    tasa = get_current_rate()
    with get_db() as conn:
        cursor = conn.cursor()
        filas = cursor.execute("""
            SELECT 
                vi.id as item_id,
                vi.venta_id,
                vi.producto_id,
                vi.descripcion,
                vi.cantidad,
                vi.precio_unitario_gtq,
                vi.costo_unitario_usd,
                v.comprador_nombre,
                v.comprador_telefono,
                v.fecha_venta,
                v.estado as venta_estado,
                p.categoria,
                p.foto_url
            FROM venta_items vi
            JOIN ventas v ON vi.venta_id = v.id
            LEFT JOIN productos p ON vi.producto_id = p.id
            WHERE v.estado != 'anulada'
            ORDER BY v.fecha_venta DESC, vi.id DESC
        """).fetchall()

        items = []
        categoria_stats = {}
        total_unidades = 0
        total_ingresos = 0.0
        total_ganancia = 0.0

        for r in filas:
            cant = int(r["cantidad"] or 1)
            precio = float(r["precio_unitario_gtq"] or 0.0)
            costo_usd = float(r["costo_unitario_usd"] or 0.0)
            costo_gtq = costo_usd * tasa
            ingreso_total = precio * cant
            costo_total = costo_gtq * cant
            ganancia = ingreso_total - costo_total
            cat = r["categoria"] or "General"
            
            total_unidades += cant
            total_ingresos += ingreso_total
            total_ganancia += ganancia

            if cat not in categoria_stats:
                categoria_stats[cat] = {
                    "categoria": cat,
                    "unidades": 0,
                    "total_gtq": 0.0,
                    "ganancia_gtq": 0.0
                }
            categoria_stats[cat]["unidades"] += cant
            categoria_stats[cat]["total_gtq"] += ingreso_total
            categoria_stats[cat]["ganancia_gtq"] += ganancia

            items.append({
                "item_id": r["item_id"],
                "venta_id": r["venta_id"],
                "producto_id": r["producto_id"],
                "descripcion": r["descripcion"],
                "cantidad": cant,
                "precio_unitario_gtq": precio,
                "costo_unitario_usd": costo_usd,
                "ingreso_total_gtq": round(ingreso_total, 2),
                "ganancia_gtq": round(ganancia, 2),
                "comprador_nombre": r["comprador_nombre"],
                "comprador_telefono": r["comprador_telefono"] or "",
                "fecha_venta": r["fecha_venta"],
                "venta_estado": r["venta_estado"],
                "categoria": cat,
                "foto_url": r["foto_url"] or ""
            })

        ranking = []
        for cat, data in categoria_stats.items():
            pct = round((data["unidades"] / total_unidades * 100), 1) if total_unidades > 0 else 0
            ranking.append({
                "categoria": cat,
                "unidades": data["unidades"],
                "porcentaje": pct,
                "total_gtq": round(data["total_gtq"], 2),
                "ganancia_gtq": round(data["ganancia_gtq"], 2)
            })

        ranking.sort(key=lambda x: x["unidades"], reverse=True)

        return {
            "resumen": {
                "total_unidades_vendidas": total_unidades,
                "total_ingresos_gtq": round(total_ingresos, 2),
                "total_ganancia_gtq": round(total_ganancia, 2),
                "categoria_top": ranking[0]["categoria"] if ranking else "N/A"
            },
            "ranking_categorias": ranking,
            "articulos": items
        }

@app.post("/api/productos")
def crear_producto(p: ProductoCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO productos (nombre, descripcion, detalles_incluye, foto_url, costo_usd, precio_sugerido_gtq, stock, categoria)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p.nombre.strip(),
            p.descripcion.strip(),
            p.detalles_incluye.strip() if p.detalles_incluye else "",
            p.foto_url or "",
            p.costo_usd,
            p.precio_sugerido_gtq,
            p.stock,
            p.categoria.strip()
        ))
        return {"ok": True, "id": cursor.lastrowid, "mensaje": "Producto guardado"}

@app.put("/api/productos/{producto_id}")
def actualizar_producto(producto_id: int, p: ProductoCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE productos 
            SET nombre = ?, descripcion = ?, detalles_incluye = ?, foto_url = ?, costo_usd = ?, precio_sugerido_gtq = ?, stock = ?, categoria = ?
            WHERE id = ?
        """, (
            p.nombre.strip(),
            p.descripcion.strip(),
            p.detalles_incluye.strip() if p.detalles_incluye else "",
            p.foto_url or "",
            p.costo_usd,
            p.precio_sugerido_gtq,
            p.stock,
            p.categoria.strip(),
            producto_id
        ))
        return {"ok": True, "mensaje": "Producto actualizado"}

@app.delete("/api/productos/{producto_id}")
def eliminar_producto(producto_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM productos WHERE id = ?", (producto_id,))
    return {"ok": True, "mensaje": "Producto eliminado"}

# --- CONFIGURACIÓN ---

@app.get("/api/configuracion")
def obtener_config():
    tasa = get_current_rate()
    with get_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("SELECT clave, valor FROM configuracion").fetchall()
        cfg = {r["clave"]: r["valor"] for r in rows}
        cfg["tasa_cambio"] = tasa
        return cfg

@app.post("/api/configuracion")
def actualizar_config(cfg: ConfigUpdate):
    with get_db() as conn:
        if cfg.tasa_cambio is not None and cfg.tasa_cambio > 0:
            set_manual_rate(cfg.tasa_cambio)
        if cfg.dias_alerta_atraso is not None and cfg.dias_alerta_atraso > 0:
            conn.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('dias_alerta_atraso', ?)", (str(cfg.dias_alerta_atraso),))
        if cfg.nombre_negocio is not None:
            conn.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('nombre_negocio', ?)", (cfg.nombre_negocio.strip(),))
        if cfg.socio_1 is not None and cfg.socio_1.strip():
            conn.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('socio_1', ?)", (cfg.socio_1.strip(),))
        if cfg.socio_2 is not None and cfg.socio_2.strip():
            conn.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('socio_2', ?)", (cfg.socio_2.strip(),))
    return {"ok": True, "mensaje": "Configuración guardada"}

# --- SERVIR FRONTEND ---
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend en construcción"}
