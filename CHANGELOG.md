# 📋 Bitácora de Cambios (CHANGELOG)

Todas las modificaciones notables y actualizaciones de versión de este sistema se registran en este documento.

---

## [v1.1.1] - 2026-09-29

### 🚀 Nuevas Características
* **Módulo de Artículos Vendidos & Estadísticas:**
  * Se creó una nueva pantalla dedicada exclusivamente a los artículos vendidos (`tab-vendidos`).
  * **Tarjetas de Rendimiento:** Unidades totales vendidas, categoría más vendida (#1), ingresos totales generados y ganancia neta acumulada.
  * **Gráfico Visual de Categorías:** Barras de porcentaje y volumen que muestran qué categoría de productos genera más ventas y rentabilidad (Consolas, Laptops, Celulares, etc.).
  * **Buscador y Filtro por Categoría:** Filtro en tiempo real para encontrar productos vendidos por nombre, comprador o categoría.
* **Depuración de Inventario Activo (Stock = 0):**
  * Los artículos que se agotan o entran en una venta ahora se ocultan automáticamente del catálogo activo de inventario.
  * Se agregó un selector *"Ver artículos agotados"* para permitir reabastecer o editar artículos sin saturar la vista principal.
* **Visualización de Versión Global:**
  * Se agregó la etiqueta `v1.1.1` en todas las pantallas: título del navegador, pantalla de Login, encabezado principal, pie de página del sistema y modal de Ajustes.

### 🛠️ Correcciones y Mejoras
* **Impresión Formal de Recibos / Comprobantes:**
  * Se aisló el área de impresión con estilos dedicados `@media print` para que la hoja salga 100% limpia en blanco y negro, sin barras de navegación, botones ni fondos oscuros.
  * Se corrigió la superposición del diálogo modal en la vista previa de impresión (ahora el modal se oculta temporalmente durante la impresión y se restaura después).
  * Se ocultó el contenedor `#areaImpresionRecibo` en la pantalla normal (`display: none !important;`) y se limpia del DOM tras imprimir, evitando que aparezca texto al fondo de la página.
* **Mensajería de WhatsApp Sanitizada:**
  * Se reemplazaron todos los emojis y caracteres de codificación variable que el navegador de Windows corrompía como signos raros (``).
  * Ahora los mensajes de confirmación de abono, estado de cuenta y recordatorio de pago salen con tipografía clara y viñetas estándar compatibles con cualquier celular y computadora.
* **Limpieza de Modales:**
  * Se removieron los botones secundarios "Cerrar" en los pies de página de los modales (Historial, Fotos, Ajustes) dejando únicamente la `✕` superior para una interfaz más limpia y sin elementos duplicados.
* **Carga de Historial en Tiempo Real:**
  * Se integró el endpoint `GET /api/ventas/{id}` en el backend para consultar y recargar inmediatamente los abonos, saldos pendientes y datos del cliente al abrir el modal de historial.

---

## [v1.1.0] - 2026-09-28

### 🚀 Nuevas Características
* **Galería y Múltiples Imágenes por Artículo:**
  * Soporte para subir múltiples fotografías por cada producto (caja, producto, número de serie, accesorios) mediante un selector múltiple y almacenamiento en `/api/upload/articulos`.
* **Select Personalizado Elegante:**
  * Reemplazo de los menús desplegables nativos del navegador por un componente moderno con iconos y estilo visual acorde al tema del sistema.
* **Sistema de Temas (Claro / Oscuro):**
  * Soporte para alternar entre tema oscuro moderno y tema claro con guardado persistente en `localStorage`.
* **Copia de Seguridad Completa:**
  * Descarga de respaldo en archivo comprimido `.zip` que incluye la base de datos SQLite y todas las fotos subidas.

### 🛠️ Mejoras
* Eliminación de las flechas y botones de incremento/decremento en las casillas de entrada numérica (precios y montos) para un diseño más limpio.
* Sistema de notificaciones flotantes (Toast) para confirmar acciones sin bloquear la pantalla con ventanas emergentes nativas.

---

## [v1.0.0] - 2026-09-27

### 🚀 Lanzamiento Inicial
* **Control de Ventas & Fiados:**
  * Registro de ventas a crédito con cálculo automático de saldos y enganches.
  * Conversión automática de divisas de Dólares ($ USD) a Quetzales (Q GTQ) con sincronización de tasa de cambio.
  * Monitoreo de clientes atrasados y cálculo de días de pago pactados.
  * Registro de abonos con soporte para foto de boleta/comprobante bancario.
  * Módulo de balance 50/50 entre socios para determinar quién tiene el dinero cobrado y cuánto debe transferir al otro.
  * Autenticación de usuario y seguridad por contraseña con sesiones recordadas.
