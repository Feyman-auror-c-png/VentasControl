# 📦 Control de Ventas, Fiados & Catálogo de Importación

![Versión](https://img.shields.io/badge/Versi%C3%B3n-v1.1.1-indigo?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Sistema web privado, rápido y responsivo diseñado para la administración integral de importación de artículos (USA en USD) y su venta al crédito o fiado (Guatemala en Quetzales GTQ). Permite llevar el control exacto de cobros mensuales, abonos con fotos de boletas bancarias, catálogo de inventario con fotos múltiples, estadísticas de desempeño por categoría y balance 50/50 entre socios.

---

## 🚀 Tecnologías Utilizadas

El sistema fue concebido bajo una arquitectura ligera, modular y sin sobrecarga de dependencias, permitiendo una velocidad de carga instantánea tanto en computadoras como en teléfonos móviles:

### ⚙️ Backend
* **Python 3.10+ / 3.13:** Lenguaje principal por su robustez, facilidad de mantenimiento y manejo de tipos.
* **FastAPI:** Framework web moderno y asíncrono de alto rendimiento para la construcción de APIs RESTful.
* **Uvicorn:** Servidor web ASGI ultrarrápido para despliegues locales y en servidores Linux.
* **Pydantic v2:** Validación estricta de esquemas de datos tipados (ventas, abonos, catálogo, usuarios).
* **SQLite 3:** Base de datos relacional ligera y autocontenida en un único archivo (`control_ventas.db`), sin necesidad de configurar servidores de base de datos pesados.
* **Python-Multipart:** Procesamiento de carga de archivos (fotos de productos, comprobantes de pago) hacia almacenamiento local seguro.
* **Requests / Urllib:** Consulta en tiempo real de la tasa de cambio USD/GTQ y codificación limpia de mensajes hacia WhatsApp.

### 🎨 Frontend
* **HTML5 Semántico:** Uso de etiquetas modernas y elementos accesibles como `<dialog>` nativo para ventanas modales perfectamente centradas en cualquier pantalla.
* **CSS3 Moderno:**
  * Variables CSS (Custom Properties) para un mantenimiento visual centralizado.
  * Soporte completo de **Tema Claro / Tema Oscuro (Dark Mode)** con transición suave.
  * Diseño responsivo mediante CSS Grid y Flexbox adaptado a celulares, tablets y monitores.
  * Reglas de impresión formal `@media print` para generar comprobantes limpios en PDF o papel.
* **Vanilla JavaScript (ES6+):**
  * Sin frameworks externos pesados (React, Angular o Vue innecesarios) para garantizar cero demoras de compilación y 100% de compatibilidad con navegadores.
  * Consumo asíncrono de la API mediante `fetch()`.
  * Persistencia de sesión y preferencias de tema en `localStorage` y `sessionStorage`.

---

## 🌟 Funcionalidades Principales

1. **Dashboard Financiero en Tiempo Real:**
   - Métricas de **Por Cobrar**, **Total Ya Cobrado**, **Ganancia Neta Estimada** y **Créditos Activos**.
   - Detección automática de clientes atrasados según la fecha de pago acordada de cada mes (ej. día 15 o fin de mes).
2. **Gestión de Créditos & Fiados:**
   - Registro de cliente, número telefónico, artículos asignados, enganche y plazos.
   - Historial detallado de pagos con recálculo dinámico de saldo pendiente.
3. **Catálogo de Inventario Inteligente:**
   - Control de stock, costo en USA ($ USD), precio en Quetzales y ganancia estimada.
   - **Depuración automática:** Los artículos con stock `0` se ocultan del inventario activo y se trasladan a ventas.
   - Soporte para subir **múltiples fotografías** por artículo (caja, producto, accesorios, número de serie).
4. **Módulo de Artículos Vendidos & Estadísticas:**
   - Pantalla dedicada con desglose de desempeño comercial.
   - Gráfico de barras por categoría (Consolas, Laptops, Celulares, Herramientas, etc.) que revela qué categoría se vende más.
   - Buscador y filtro dinámico por categoría.
5. **Recibos y Comprobantes Formales Imprimibles:**
   - Generación de comprobante formal con estado de cuenta, historial de abonos y líneas para firmas del comprador y vendedor.
   - Formato A4/Carta limpio en blanco y negro, libre de elementos visuales de la aplicación.
6. **Integración con WhatsApp:**
   - Generación de enlaces directos `wa.me` con mensajes preformateados para confirmación de abono, recordatorios de cobro y resúmenes de saldo (sin caracteres corruptos).
7. **Balance 50/50 entre Hermanos / Socios:**
   - Monitoreo de quién de los socios cobró cada abono (Hermano 1 / Hermano 2) y cálculo de la transferencia requerida para quedar tablas.
8. **Seguridad y Respaldo:**
   - Pantalla de inicio de sesión con opción de recordar equipo.
   - Descarga de copia de seguridad completa en archivo `.zip` (base de datos + fotos) en 1 solo clic.

---

## 📋 Requisitos Previos

* **Python 3.10 o superior** instalado en el equipo ([Descargar Python](https://www.python.org/downloads/)).
* Asegurarse de marcar la casilla **"Add Python to PATH"** durante la instalación en Windows.
* Navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox o Safari).

---

## 💻 Instalación y Puesta en Marcha

### 🪟 En Windows (Uso Local / PC)

#### Opción 1: Inicio Rápido (Recomendada)
Haz doble clic sobre el archivo ejecutable por lotes:
```cmd
iniciar.bat
```
El script creará automáticamente el entorno virtual si no existe, instalará las dependencias y abrirá el servidor.

#### Opción 2: Instalación Manual por Consola
1. Abre PowerShell o CMD en la carpeta del proyecto:
   ```powershell
   # 1. Crear entorno virtual
   python -m venv .venv

   # 2. Activar el entorno virtual
   .venv\Scripts\activate

   # 3. Instalar librerías
   pip install -r requirements.txt

   # 4. Iniciar el servidor
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. Abre tu navegador en:
   - **En la misma PC:** `http://localhost:8000`
   - **Desde tu celular (conectado al mismo Wi-Fi):** `http://TU_IP_LOCAL:8000` (ejemplo: `http://192.168.1.15:8000`).

---

### 🐧 En Servidor Linux (Ubuntu Server / Debian)

1. **Clonar o transferir la carpeta al servidor:**
   ```bash
   cd "APP HERMANO"
   ```

2. **Otorgar permisos y ejecutar el script automatizado:**
   ```bash
   chmod +x start_ubuntu.sh
   ./start_ubuntu.sh
   ```

3. **Ejecución permanente en segundo plano (Opcional con PM2):**
   Si deseas que la aplicación continúe corriendo incluso al cerrar la terminal:
   ```bash
   # Instalar PM2 si no lo tienes (requiere Node.js)
   sudo npm install -g pm2

   # Iniciar el servicio
   pm2 start ".venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000" --name "control-ventas"

   # Guardar para que inicie al reiniciar el servidor
   pm2 save
   pm2 startup
   ```

---

## 🔐 Credenciales de Acceso

La aplicación no incluye credenciales predeterminadas. Crea cada usuario desde el
contenedor y asígnalo a un espacio de trabajo:

```bash
docker compose exec ventascontrol python -m backend.manage_users \
  --username usuario --password 'contraseña-segura' \
  --name 'Nombre visible' --workspace 'Nombre del espacio'
```

Los usuarios del mismo espacio comparten ventas, inventario, abonos y
configuración. Los usuarios de espacios diferentes mantienen sus datos aislados.

### Edición de fiados y uso en teléfono

En **Fiados Activos**, pulsa **Editar** para corregir cliente, WhatsApp, fecha,
día de pago, total acordado, detalles de entrega o notas. Los abonos y artículos
se conservan: el total no puede quedar por debajo de lo abonado; si coincide,
el fiado pasa a completado. La edición respeta el espacio de trabajo del usuario.

En teléfonos, las métricas y pestañas se distribuyen en dos columnas; los botones
tienen áreas táctiles mayores y los formularios se adaptan a la altura disponible.

Pruebas de la edición, con base de datos temporal independiente:

```bash
python -m unittest discover -s tests -v
```

### Despliegue con Docker

```bash
docker compose up -d --build
curl http://127.0.0.1:8091/health
```

La base de datos y las fotos se guardan de forma persistente en `./data/`.

---

## 📁 Estructura del Proyecto

```text
APP HERMANO/
│
├── backend/
│   ├── main.py              # Endpoints API REST, lógica de ventas, productos y abonos
│   ├── database.py          # Conexión SQLite y creación de tablas/esquema
│   ├── auth.py              # Sistema de autenticación de usuario y contraseñas
│   ├── currency_helper.py   # Consulta y cálculo de tipo de cambio USD/GTQ
│   └── whatsapp_helper.py   # Generación de mensajes y enlaces limpios para WhatsApp
│
├── frontend/
│   ├── index.html           # Estructura de la aplicación web y modales
│   ├── style.css            # Estilos modernos, Dark Mode y reglas @media print
│   └── app.js               # Lógica del cliente, llamadas API y renderizado reactivo
│
├── uploads/                 # Directorio local de imágenes (fotos de artículos y boletas)
│   ├── articulos/
│   └── comprobantes/
│
├── control_ventas.db        # Base de datos SQLite (almacenamiento local)
├── requirements.txt         # Lista de dependencias de Python
├── CHANGELOG.md             # Historial de cambios y versiones (v1.1.1)
├── README.md                # Documentación oficial del proyecto
├── iniciar.bat              # Script de inicio en 1 clic para Windows
└── start_ubuntu.sh          # Script de inicio para servidores Ubuntu
```

---

## 📄 Licencia y Uso

Proyecto privado desarrollado para control interno de ventas, créditos y cobranzas familiares.
