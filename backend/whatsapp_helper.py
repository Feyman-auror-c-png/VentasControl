import urllib.parse
from datetime import datetime

def format_phone_number(raw_phone: str) -> str:
    if not raw_phone:
        return ""
    digits = "".join(ch for ch in str(raw_phone) if ch.isdigit())
    if len(digits) == 8:
        return f"502{digits}"
    return digits

def generate_whatsapp_message(tipo: str, venta: dict, abono_reciente: dict = None) -> str:
    cliente = venta.get("comprador_nombre", "estimado cliente").strip()
    items = venta.get("items", [])
    
    if items:
        nombres_items = []
        for it in items:
            desc = it.get("descripcion", "").strip()
            cant = it.get("cantidad", 1)
            if cant > 1:
                nombres_items.append(f"{cant}x {desc}")
            else:
                nombres_items.append(desc)
        articulos = ", ".join(nombres_items)
    else:
        articulos = "artículo acordado"
    
    total = venta.get("total_gtq", 0.0)
    abonado = venta.get("total_abonado", 0.0)
    saldo = venta.get("saldo_pendiente", 0.0)
    dia_pago = venta.get("dia_pago_mes", 15)
    
    f_total = f"Q{total:,.2f}"
    f_abonado = f"Q{abonado:,.2f}"
    f_saldo = f"Q{saldo:,.2f}"

    if tipo == "abono_recibido" and abono_reciente:
        monto_reciente = f"Q{abono_reciente.get('monto_gtq', 0.0):,.2f}"
        fecha_abono = abono_reciente.get("fecha_abono", datetime.now().strftime("%d/%m/%Y"))
        msg = (
            f"*CONFIRMACION DE ABONO RECIBIDO*\n\n"
            f"Hola {cliente}!\n"
            f"Te confirmamos la recepcion de tu pago.\n\n"
            f"- *Articulo:* {articulos}\n"
            f"- *Monto abonado hoy:* *{monto_reciente}*\n"
            f"- *Fecha:* {fecha_abono}\n"
            f"- *Total abonado a la fecha:* {f_abonado} de {f_total}\n"
        )
        if saldo <= 0:
            msg += (
                f"\n*Excelente noticia! Tu cuenta ha sido cancelada en su totalidad.*\n"
                f"Muchas gracias por tu preferencia y puntualidad. Que disfrutes tu compra!"
            )
        else:
            msg += (
                f"- *Saldo pendiente restante:* *{f_saldo}*\n"
                f"- *Dia de pago pactado:* {dia_pago} de cada mes\n\n"
                f"Muchas gracias por tu pago! Quedamos a la orden."
            )
        return msg

    elif tipo == "recordatorio":
        msg = (
            f"*RECORDATORIO DE PAGO*\n\n"
            f"Hola {cliente}!\n"
            f"Te saludamos cordialmente. Te compartimos el recordatorio de tu cuenta de:\n"
            f"- *{articulos}*\n\n"
            f"- *Dia de pago acordado:* {dia_pago} de cada mes\n"
            f"- *Total de la compra:* {f_total}\n"
            f"- *Total abonado a la fecha:* {f_abonado}\n"
            f"- *Saldo pendiente:* *{f_saldo}*\n\n"
            f"Si ya realizaste tu deposito o transferencia, por favor envianos la foto de la boleta o comprobante por este medio para registrarlo. Muchas gracias por tu puntualidad!"
        )
        return msg

    else: # 'resumen'
        msg = (
            f"*ESTADO DE CUENTA*\n\n"
            f"Hola {cliente}!\n"
            f"Te compartimos el detalle actualizado de tu credito por:\n"
            f"- *{articulos}*\n\n"
            f"- *Dia de pago acordado:* {dia_pago} de cada mes\n"
            f"- *Total acordado:* {f_total}\n"
            f"- *Total abonado:* {f_abonado}\n"
            f"- *Saldo pendiente:* *{f_saldo}*\n\n"
            f"Cualquier consulta o para registrar tu proximo abono, estamos a las ordenes por este chat. Feliz dia!"
        )
        return msg

def get_whatsapp_url(phone: str, message: str) -> str:
    clean_phone = format_phone_number(phone)
    encoded = urllib.parse.quote(message)
    if clean_phone:
        return f"https://wa.me/{clean_phone}?text={encoded}"
    return f"https://wa.me/?text={encoded}"
