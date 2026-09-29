// ESTADO GLOBAL
let appState = {
  usuario: null,
  ventas: [],
  productos: [],
  articulosVendidos: [],
  resumenVendidos: {},
  rankingCategorias: [],
  dashboard: {},
  tasaCambio: 7.80,
  ventaSeleccionada: null,
  tema: 'light',
  // Array de fotos en edición de producto: puede contener strings (URLs ya guardadas) o File objects
  prodFotosEdicion: []
};

// INICIALIZACIÓN Y SESIÓN
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  verificarSesion();
  
  const today = new Date().toISOString().split('T')[0];
  const abonoFecha = document.getElementById('abonoFecha');
  if (abonoFecha) abonoFecha.value = today;

  document.getElementById('rateBadge').addEventListener('click', () => {
    document.getElementById('nuevaTasaInput').value = appState.tasaCambio;
    abrirModal('modalTasa');
  });

  // Cerrar custom select al hacer clic fuera
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('catDropdownWrapper');
    const menu = document.getElementById('catDropdownMenu');
    if (wrapper && menu && !wrapper.contains(e.target)) {
      menu.classList.add('hidden');
      wrapper.classList.remove('open');
    }
  });
});

// --- SISTEMA DE NOTIFICACIONES TOAST (ELEGANTES, SIN ALERT NATIVO) ---
function mostrarToast(mensaje, tipo = 'exito') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;

  let iconSvg = '';
  let titulo = 'Información';

  if (tipo === 'exito') {
    titulo = '¡Completado con éxito!';
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (tipo === 'error') {
    titulo = 'Atención';
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    titulo = 'Aviso';
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-content">
      <div class="toast-title">${titulo}</div>
      <div class="toast-msg">${escapeHtml(mensaje)}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto-eliminar después de 3.5 segundos con animación suave
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- MODAL DE CONFIRMACIÓN ELEGANTE (SIN CONFIRM NATIVO) ---
let callbackConfirmacionActual = null;

function mostrarConfirmacion({ titulo, mensaje, botonTexto = 'Sí, eliminar', onConfirm }) {
  document.getElementById('confirmacionTitulo').textContent = titulo || '¿Estás seguro?';
  document.getElementById('confirmacionMensaje').textContent = mensaje || 'Esta acción no se puede deshacer.';
  const btn = document.getElementById('btnConfirmarAccion');
  btn.textContent = botonTexto;

  callbackConfirmacionActual = onConfirm;

  btn.onclick = () => {
    cerrarModal('modalConfirmacion');
    if (typeof callbackConfirmacionActual === 'function') {
      callbackConfirmacionActual();
    }
  };

  abrirModal('modalConfirmacion');
}

// --- SISTEMA DE TEMAS (CLARO / OSCURO) ---
function inicializarTema() {
  const guardado = localStorage.getItem('app_theme') || 'light';
  aplicarTema(guardado);
}

function aplicarTema(tema) {
  appState.tema = tema;
  localStorage.setItem('app_theme', tema);
  
  if (tema === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggleIcon').textContent = '☀️';
    document.getElementById('themeToggleText').textContent = 'Claro';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggleIcon').textContent = '🌙';
    document.getElementById('themeToggleText').textContent = 'Oscuro';
  }
}

function alternarTema() {
  const nuevoTema = appState.tema === 'dark' ? 'light' : 'dark';
  aplicarTema(nuevoTema);
}

// --- CUSTOM SELECT DROPDOWN COMPONENT ---
function toggleCustomSelect(menuId) {
  const menu = document.getElementById(menuId);
  const wrapper = document.getElementById('catDropdownWrapper');
  if (!menu || !wrapper) return;

  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    wrapper.classList.add('open');
  } else {
    menu.classList.add('hidden');
    wrapper.classList.remove('open');
  }
}

function selectCustomOption(optionEl, inputId, displayId, menuId) {
  const val = optionEl.getAttribute('data-value');
  const input = document.getElementById(inputId);
  const display = document.getElementById(displayId);
  const menu = document.getElementById(menuId);
  const wrapper = document.getElementById('catDropdownWrapper');

  if (input) input.value = val;
  if (display) display.innerHTML = optionEl.innerHTML;

  document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
  optionEl.classList.add('selected');

  if (menu) menu.classList.add('hidden');
  if (wrapper) wrapper.classList.remove('open');
}

function setCustomSelectValue(val) {
  const input = document.getElementById('prodCategoria');
  const display = document.getElementById('catSelectedDisplay');
  if (input) input.value = val;

  const option = document.querySelector(`.custom-select-option[data-value="${val}"]`);
  if (option && display) {
    display.innerHTML = option.innerHTML;
    document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
  }
}

// --- AUTENTICACIÓN ---
function verificarSesion() {
  const token = localStorage.getItem('app_token') || sessionStorage.getItem('app_token');
  const user = localStorage.getItem('app_user') || sessionStorage.getItem('app_user');
  
  if (token && user) {
    appState.usuario = user;
    mostrarApp();
  } else {
    mostrarLogin();
  }
}

function mostrarLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('appScreen').classList.add('hidden');
}

function mostrarApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  cargarDashboard();
  cargarVentas();
  cargarProductos();
  cargarArticulosVendidos();
}

async function realizarLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const remember = document.getElementById('loginRemember').checked;
  const errBox = document.getElementById('loginError');

  errBox.classList.add('hidden');
  errBox.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: user, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error de acceso');

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('app_token', data.token);
    storage.setItem('app_user', data.usuario);

    appState.usuario = data.usuario;
    mostrarApp();
    mostrarToast('Bienvenido al sistema de ventas', 'exito');
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

function cerrarSesion() {
  localStorage.removeItem('app_token');
  localStorage.removeItem('app_user');
  sessionStorage.removeItem('app_token');
  sessionStorage.removeItem('app_user');
  location.reload();
}

async function cambiarPassword(e) {
  e.preventDefault();
  const actual = document.getElementById('passActual').value;
  const nueva = document.getElementById('passNueva').value;

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: appState.usuario || 'admin',
        password_actual: actual,
        nueva_password: nueva
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error cambiando contraseña');
    mostrarToast('Contraseña cambiada con éxito', 'exito');
    cerrarModal('modalAjustes');
    document.getElementById('formCambiarPass').reset();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

// --- GESTIÓN DE MÚLTIPLES FOTOS ---
function manejarFotosMultiples(input) {
  if (!input.files || input.files.length === 0) return;

  for (let i = 0; i < input.files.length; i++) {
    appState.prodFotosEdicion.push(input.files[i]);
  }
  input.value = '';
  renderizarGridFotosEdicion();
}

function renderizarGridFotosEdicion() {
  const grid = document.getElementById('prodFotosGrid');
  if (!grid) return;
  grid.innerHTML = '';

  appState.prodFotosEdicion.forEach((foto, idx) => {
    const item = document.createElement('div');
    item.className = 'multi-preview-item';

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove-img';
    btnRemove.innerHTML = '✕';
    btnRemove.title = 'Quitar esta foto';
    btnRemove.onclick = (e) => {
      e.stopPropagation();
      eliminarFotoEdicion(idx);
    };

    if (typeof foto === 'string') {
      // URL existente
      item.innerHTML = `<img src="${foto}" alt="Foto ${idx + 1}">`;
      item.appendChild(btnRemove);
      grid.appendChild(item);
    } else {
      // File object
      const reader = new FileReader();
      reader.onload = (e) => {
        item.innerHTML = `<img src="${e.target.result}" alt="Foto ${idx + 1}">`;
        item.appendChild(btnRemove);
        grid.appendChild(item);
      };
      reader.readAsDataURL(foto);
    }
  });
}

function eliminarFotoEdicion(index) {
  appState.prodFotosEdicion.splice(index, 1);
  renderizarGridFotosEdicion();
}

// PREVIEW SIMPLE PARA BOLETA DE ABONO
function previewImage(input, previewId, placeholderId) {
  const preview = document.getElementById(previewId);
  const placeholder = document.getElementById(placeholderId);
  
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" style="max-height: 140px; border-radius: 8px;">
        <span class="upload-preview-tag">✅ Boleta lista</span>
      `;
      placeholder.classList.add('hidden');
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function limpiarDropzone(previewId, placeholderId, inputId) {
  const preview = document.getElementById(previewId);
  const placeholder = document.getElementById(placeholderId);
  const input = document.getElementById(inputId);
  if (input) input.value = '';
  if (preview) {
    preview.innerHTML = '';
    preview.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
}

// --- GESTIÓN DE TABS ---
function cambiarTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
  if (tabId === 'tab-vendidos') {
    cargarArticulosVendidos();
  }
}

// --- FORMATO DE MONEDA & TEXTO ---
function fQ(num) {
  return 'Q' + Number(num || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fUSD(num) {
  return '$' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function obtenerIniciales(nombre) {
  if (!nombre) return 'CL';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

// 1. CARGA DE DASHBOARD
async function cargarDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    if (!res.ok) return;
    const d = await res.json();
    appState.dashboard = d;
    appState.tasaCambio = d.tasa_cambio || 7.80;

    document.getElementById('tasaValor').textContent = `Q${appState.tasaCambio.toFixed(2)}`;
    document.getElementById('metricaPorCobrar').textContent = fQ(d.total_por_cobrar_gtq);
    document.getElementById('metricaCobrado').textContent = fQ(d.total_cobrado_gtq);
    document.getElementById('metricaGanancia').textContent = fQ(d.ganancia_neta_estimada_gtq);
    document.getElementById('metricaActivos').textContent = d.ventas_activas_count;

    const badgeAtraso = document.getElementById('badgeAtrasados');
    if (d.ventas_atrasadas_count > 0) {
      badgeAtraso.textContent = `${d.ventas_atrasadas_count} atrasado${d.ventas_atrasadas_count > 1 ? 's' : ''}`;
      badgeAtraso.classList.remove('hidden');
    } else {
      badgeAtraso.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error cargando métricas:', err);
  }
}

// 2. CARGA DE VENTAS
async function cargarVentas() {
  try {
    const res = await fetch('/api/ventas');
    if (!res.ok) return;
    appState.ventas = await res.json();
    renderizarVentas();
  } catch (err) {
    console.error('Error cargando ventas:', err);
  }
}

function renderizarVentas() {
  const containerActivas = document.getElementById('listaVentasActivas');
  const containerCompletadas = document.getElementById('listaVentasCompletadas');
  const emptyState = document.getElementById('emptyVentas');

  const q = (document.getElementById('busquedaInput').value || '').toLowerCase().trim();
  const soloAtrasados = document.getElementById('filtroSoloAtrasados').checked;

  containerActivas.innerHTML = '';
  containerCompletadas.innerHTML = '';

  const activas = appState.ventas.filter(v => v.estado === 'activa');
  const completadas = appState.ventas.filter(v => v.estado === 'completada');

  document.getElementById('countActivas').textContent = activas.length;
  document.getElementById('countCompletadas').textContent = completadas.length;

  let activasFiltradas = activas.filter(v => {
    const matchText = (v.comprador_nombre || '').toLowerCase().includes(q) ||
                      (v.comprador_telefono || '').includes(q) ||
                      (v.detalles_entrega || '').toLowerCase().includes(q) ||
                      (v.notas || '').toLowerCase().includes(q) ||
                      (v.items.some(i => (i.descripcion || '').toLowerCase().includes(q)));
    if (!matchText) return false;
    if (soloAtrasados && !v.esta_atrasado) return false;
    return true;
  });

  if (activasFiltradas.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    activasFiltradas.forEach(v => {
      containerActivas.appendChild(crearCardVenta(v, false));
    });
  }

  completadas.forEach(v => {
    containerCompletadas.appendChild(crearCardVenta(v, true));
  });
}

function filtrarVentas() {
  renderizarVentas();
}

// CREAR TARJETA DE VENTA
function crearCardVenta(v, esCompletada) {
  const card = document.createElement('div');
  card.className = `venta-card ${v.esta_atrasado ? 'atrasado' : ''}`;

  const productosDesc = v.items.map(i => `${i.cantidad > 1 ? i.cantidad + 'x ' : ''}${i.descripcion}`).join(', ') || 'Artículo general';
  const iniciales = obtenerIniciales(v.comprador_nombre);
  
  let estadoBadge = '';
  const diaPago = v.dia_pago_mes || 15;

  if (esCompletada) {
    estadoBadge = `<span class="status-badge pagado">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Liquidado 100%
    </span>`;
  } else if (v.ha_pagado_este_mes) {
    estadoBadge = `<span class="status-badge al-dia">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Mes al día
    </span>`;
  } else if (v.atrasado_por_fecha_mes) {
    estadoBadge = `<span class="status-badge atrasado">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      Venció el día ${diaPago}
    </span>`;
  } else {
    estadoBadge = `<span class="status-badge pendiente-mes">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      Paga el día ${diaPago}
    </span>`;
  }

  let inactividadTexto = '';
  if (!esCompletada) {
    if (v.ultimo_abono_fecha) {
      inactividadTexto = `<div class="inactividad-info ${v.esta_atrasado ? 'alerta' : ''}">
        <span>Último abono: ${v.ultimo_abono_fecha} (${v.dias_inactivo} días)</span>
      </div>`;
    } else {
      inactividadTexto = `<div class="inactividad-info ${v.esta_atrasado ? 'alerta' : ''}">
        <span>Vendido: ${v.fecha_venta} (${v.dias_inactivo} días)</span>
      </div>`;
    }
  }

  // Soporte para una o varias fotos
  let fotosLista = [];
  if (v.foto_articulo) {
    fotosLista = v.foto_articulo.split(',').map(s => s.trim()).filter(Boolean);
  }

  let fotoThumbHtml = '';
  if (fotosLista.length > 0) {
    const primera = fotosLista[0];
    const badgeMas = fotosLista.length > 1 ? `<span class="badge-fotos-count">+${fotosLista.length}</span>` : '';
    fotoThumbHtml = `
      <div class="articulo-thumb-container">
        <img src="${primera}" alt="Artículo" class="articulo-thumb" onclick="abrirFotoFull('${fotosLista.join(',')}', '${escapeHtml(productosDesc)}')" title="Clic para ver galería (${fotosLista.length} fotos)">
        ${badgeMas}
      </div>
    `;
  } else {
    fotoThumbHtml = `
      <div class="articulo-thumb" style="display:flex; align-items:center; justify-content:center; background:var(--bg-card); color:var(--text-muted);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="venta-header">
      <div class="cliente-profile">
        <div class="cliente-avatar">${iniciales}</div>
        <div class="cliente-meta">
          <span class="cliente-nombre">${escapeHtml(v.comprador_nombre)}</span>
          <span class="cliente-telefono">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            ${v.comprador_telefono ? escapeHtml(v.comprador_telefono) : 'Sin teléfono'}
          </span>
        </div>
      </div>
      <div>${estadoBadge}</div>
    </div>

    <div class="venta-body">
      <div class="articulo-preview-row">
        ${fotoThumbHtml}
        <div class="producto-title-box">
          <span class="producto-title" title="${escapeHtml(productosDesc)}">${escapeHtml(productosDesc)}</span>
          <span class="producto-detalles-pill">${v.detalles_entrega ? escapeHtml(v.detalles_entrega) : 'Sin especificaciones'}</span>
        </div>
      </div>

      <div class="dia-pago-tag">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span>Paga los días <strong>${diaPago}</strong> de cada mes</span>
      </div>

      <div class="cifras-grid">
        <div class="cifra-item">
          <span class="cifra-label">Total Acordado</span>
          <span class="cifra-val text-blue">${fQ(v.total_gtq)}</span>
        </div>
        <div class="cifra-item">
          <span class="cifra-label">${esCompletada ? 'Total Pagado' : 'Saldo Pendiente'}</span>
          <span class="cifra-val ${esCompletada ? 'text-green' : 'text-orange'}">
            ${esCompletada ? fQ(v.total_gtq) : fQ(v.saldo_pendiente)}
          </span>
        </div>
      </div>

      <div class="progress-container">
        <div class="progress-labels">
          <span>Abonado: <strong>${fQ(v.total_abonado)}</strong></span>
          <span>${v.porcentaje_pagado}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${Math.min(100, v.porcentaje_pagado)}%"></div>
        </div>
      </div>

      ${inactividadTexto}
      ${v.notas ? `<div style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-subtle); padding:0.4rem 0.6rem; border-radius:6px;">📝 ${escapeHtml(v.notas)}</div>` : ''}
    </div>

    <div class="venta-footer">
      ${!esCompletada ? `
        <button class="btn btn-success flex-1" onclick="abrirModalAbono(${v.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Abonar
        </button>
      ` : ''}
      
      <a href="${v.esta_atrasado ? v.wa_url_recordatorio : v.wa_url_resumen}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" title="Enviar WhatsApp al cliente">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-10.416c-4.401 0-7.98 3.58-7.98 7.981 0 1.41.371 2.735 1.018 3.883l-1.046 3.824 3.931-1.031c1.109.605 2.379.945 3.73.945 4.402 0 7.98-3.58 7.98-7.982 0-4.402-3.578-7.98-7.98-7.98z"/></svg>
        WhatsApp
      </a>

      <button class="btn btn-outline" onclick="abrirDetalleVenta(${v.id})" title="Ver historial de abonos">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        Historial
      </button>

      <button class="btn btn-danger-outline" onclick="eliminarVenta(${v.id})" title="Eliminar crédito">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `;

  return card;
}

// 3. REGISTRAR ABONO
function abrirModalAbono(ventaId) {
  const v = appState.ventas.find(x => x.id === ventaId);
  if (!v) return;

  document.getElementById('abonoVentaId').value = v.id;
  document.getElementById('modalAbonoTitulo').textContent = `Abonar a: ${v.comprador_nombre}`;
  document.getElementById('abonoVentaTotal').textContent = fQ(v.total_gtq);
  document.getElementById('abonoVentaAbonado').textContent = fQ(v.total_abonado);
  document.getElementById('abonoVentaSaldo').textContent = fQ(v.saldo_pendiente);

  document.getElementById('abonoMonto').value = '';
  document.getElementById('abonoMonto').max = v.saldo_pendiente;
  document.getElementById('abonoBoleta').value = '';
  document.getElementById('abonoNota').value = '';
  
  limpiarDropzone('abonoFotoPreview', 'abonoUploadPlaceholder', 'abonoFotoFile');

  abrirModal('modalAbono');
  setTimeout(() => document.getElementById('abonoMonto').focus(), 150);
}

async function guardarAbono(e) {
  e.preventDefault();
  const ventaId = document.getElementById('abonoVentaId').value;
  const monto = parseFloat(document.getElementById('abonoMonto').value);
  const fecha = document.getElementById('abonoFecha').value;
  const metodo = document.getElementById('abonoMetodo').value;
  const boleta = document.getElementById('abonoBoleta').value.trim();
  const nota = document.getElementById('abonoNota').value.trim();
  const fileInput = document.getElementById('abonoFotoFile');

  const btn = document.getElementById('btnGuardarAbono');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    let fotoUrl = '';
    if (fileInput.files && fileInput.files[0]) {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      const upRes = await fetch('/api/upload/comprobante', { method: 'POST', body: formData });
      if (upRes.ok) {
        const upData = await upRes.json();
        fotoUrl = upData.url;
      }
    }

    const payload = {
      monto_gtq: monto,
      fecha_abono: fecha || null,
      metodo_pago: metodo,
      numero_boleta: boleta,
      foto_comprobante: fotoUrl,
      notas: nota,
      recibido_por: 'Hermano'
    };

    const res = await fetch(`/api/ventas/${ventaId}/abonos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al guardar abono');
    }

    const data = await res.json();
    cerrarModal('modalAbono');

    // Actualizar datos
    await cargarDashboard();
    await cargarVentas();
    await cargarArticulosVendidos();

    mostrarToast(`Abono de ${fQ(monto)} registrado con éxito`, 'exito');

    // Enlace de WhatsApp sin errores
    const waUrl = data.wa_url_confirmacion || data.wa_url_recibo;
    const btnWa = document.getElementById('btnEnviarWaConfirmacion');
    if (waUrl) {
      btnWa.href = waUrl;
      btnWa.classList.remove('hidden');
    }

    document.getElementById('modalExitoTexto').textContent = 
      `Se registró el abono de ${fQ(monto)}. Saldo pendiente: ${fQ(data.saldo_pendiente)}`;
    abrirModal('modalAbonoExito');

  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Confirmar Abono
    `;
  }
}

// 4. NUEVA VENTA / CRÉDITO
function abrirModalNuevaVenta(preselectProdId) {
  document.getElementById('formNuevaVenta').reset();
  document.getElementById('ventaArticuloPreviewBox').classList.add('hidden');
  document.getElementById('ventaManualInputs').classList.remove('hidden');
  
  // Poblar select de productos
  const sel = document.getElementById('selectProducto');
  sel.innerHTML = '<option value="">-- Elige un artículo del catálogo --</option>';
  appState.productos.forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.nombre)} - Costo: ${fUSD(p.costo_usd)} | Q${p.precio_sugerido_gtq}</option>`;
  });

  if (preselectProdId) {
    sel.value = preselectProdId;
    seleccionarProductoInventario(preselectProdId);
  }

  document.getElementById('ventaDiaPago').value = 15;
  document.getElementById('ventaEnganche').value = 0;
  calcularMargenNuevaVenta();
  abrirModal('modalNuevaVenta');
}

function seleccionarProductoInventario(prodId) {
  const previewBox = document.getElementById('ventaArticuloPreviewBox');
  const manualInputs = document.getElementById('ventaManualInputs');

  if (!prodId) {
    previewBox.classList.add('hidden');
    manualInputs.classList.remove('hidden');
    return;
  }

  const p = appState.productos.find(x => x.id == prodId);
  if (!p) return;

  document.getElementById('ventaPreviewTitulo').textContent = p.nombre;
  document.getElementById('ventaPreviewIncluye').textContent = p.detalles_incluye || 'Sin especificaciones';
  document.getElementById('ventaPreviewCosto').textContent = `${p.categoria} | Costo: ${fUSD(p.costo_usd)} (aprox. Q${(p.costo_usd * appState.tasaCambio).toFixed(2)})`;
  
  const imgEl = document.getElementById('ventaPreviewImg');
  if (p.foto_url) {
    const primera = p.foto_url.split(',')[0].trim();
    imgEl.src = primera;
    imgEl.classList.remove('hidden');
  } else {
    imgEl.classList.add('hidden');
  }

  previewBox.classList.remove('hidden');
  manualInputs.classList.add('hidden');

  document.getElementById('ventaItemDesc').value = p.nombre;
  document.getElementById('ventaItemCostoUsd').value = p.costo_usd;
  document.getElementById('ventaTotal').value = p.precio_sugerido_gtq || '';

  calcularMargenNuevaVenta();
}

function calcularMargenNuevaVenta() {
  const totalGtq = parseFloat(document.getElementById('ventaTotal').value) || 0;
  const costoUsd = parseFloat(document.getElementById('ventaItemCostoUsd').value) || 0;
  const costoGtq = costoUsd * appState.tasaCambio;
  const ganancia = totalGtq - costoGtq;

  const el = document.getElementById('previewGananciaValor');
  el.textContent = fQ(ganancia);
  if (ganancia >= 0) {
    el.className = 'text-green';
  } else {
    el.className = 'text-orange';
  }
}

async function guardarNuevaVenta(e) {
  e.preventDefault();
  const cliente = document.getElementById('ventaCliente').value.trim();
  const telefono = document.getElementById('ventaTelefono').value.trim();
  const totalGtq = parseFloat(document.getElementById('ventaTotal').value);
  const enganche = parseFloat(document.getElementById('ventaEnganche').value) || 0;
  const diaPago = parseInt(document.getElementById('ventaDiaPago').value) || 15;
  const notas = document.getElementById('ventaNotas').value.trim();

  const prodId = document.getElementById('selectProducto').value;
  let desc = document.getElementById('ventaItemDesc').value.trim();
  let costoUsd = parseFloat(document.getElementById('ventaItemCostoUsd').value) || 0;
  let fotoArticulo = '';
  let detallesEntrega = '';

  if (prodId) {
    const prod = appState.productos.find(x => x.id == prodId);
    if (prod) {
      desc = prod.nombre;
      costoUsd = prod.costo_usd;
      fotoArticulo = prod.foto_url || '';
      detallesEntrega = prod.detalles_incluye || '';
    }
  }

  if (!desc) {
    mostrarToast('Debes indicar qué producto se está vendiendo', 'error');
    return;
  }

  const payload = {
    comprador_nombre: cliente,
    comprador_telefono: telefono,
    dia_pago_mes: diaPago,
    total_gtq: totalGtq,
    costo_total_usd: costoUsd,
    enganche_inicial: enganche,
    notas: notas,
    foto_articulo: fotoArticulo,
    detalles_entrega: detallesEntrega,
    recibido_por: 'Hermano',
    items: [
      {
        producto_id: prodId ? parseInt(prodId) : null,
        descripcion: desc,
        cantidad: 1,
        precio_unitario_gtq: totalGtq,
        costo_unitario_usd: costoUsd
      }
    ]
  };

  const btn = document.getElementById('btnGuardarVenta');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al guardar venta');
    }

    cerrarModal('modalNuevaVenta');
    await cargarDashboard();
    await cargarVentas();
    await cargarProductos();
    await cargarArticulosVendidos();
    mostrarToast('Venta registrada correctamente', 'exito');
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Venta';
  }
}

function eliminarVenta(id) {
  mostrarConfirmacion({
    titulo: '¿Eliminar este crédito?',
    mensaje: 'Se eliminará la venta y todos los abonos registrados a este cliente.',
    botonTexto: 'Sí, eliminar crédito',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/ventas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        await cargarDashboard();
        await cargarVentas();
        await cargarProductos();
        await cargarArticulosVendidos();
        mostrarToast('Crédito eliminado con éxito', 'exito');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    }
  });
}

// 5. INVENTARIO / PRODUCTOS
async function cargarProductos() {
  try {
    const res = await fetch('/api/productos');
    if (!res.ok) return;
    appState.productos = await res.json();
    renderizarProductos();
  } catch (err) {
    console.error('Error cargando catálogo:', err);
  }
}

function renderizarProductos() {
  const tbody = document.getElementById('tablaProductosBody');
  const countEl = document.getElementById('countProductos');
  const disponibles = appState.productos.filter(p => p.stock > 0);
  if (countEl) countEl.textContent = disponibles.length;
  if (!tbody) return;

  tbody.innerHTML = '';
  const q = (document.getElementById('busquedaProdInput')?.value || '').toLowerCase().trim();
  const mostrarAgotados = document.getElementById('filtroMostrarAgotados')?.checked || false;

  const filtrados = appState.productos.filter(p => {
    if (!mostrarAgotados && p.stock <= 0) return false;
    return (p.nombre || '').toLowerCase().includes(q) ||
           (p.categoria || '').toLowerCase().includes(q) ||
           (p.detalles_incluye || '').toLowerCase().includes(q);
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 3rem; color: var(--text-muted);">
      No hay artículos en el inventario que coincidan con la búsqueda.
    </td></tr>`;
    return;
  }

  filtrados.forEach(p => {
    const costoGtq = p.costo_usd * appState.tasaCambio;
    const ganancia = p.precio_sugerido_gtq - costoGtq;

    // Soporte para una o múltiples fotos
    let fotosArr = [];
    if (p.foto_url) {
      fotosArr = p.foto_url.split(',').map(s => s.trim()).filter(Boolean);
    }

    let fotoHtml = '';
    if (fotosArr.length > 0) {
      const badgeCount = fotosArr.length > 1 ? `<span class="badge-fotos-count">+${fotosArr.length}</span>` : '';
      fotoHtml = `
        <div class="articulo-thumb-container">
          <img src="${fotosArr[0]}" class="prod-thumb-mini" alt="${escapeHtml(p.nombre)}" onclick="abrirFotoFull('${fotosArr.join(',')}', '${escapeHtml(p.nombre)}')" title="Clic para ver galería (${fotosArr.length} fotos)">
          ${badgeCount}
        </div>
      `;
    } else {
      fotoHtml = `<div class="prod-thumb-mini" style="display:flex; align-items:center; justify-content:center; background:var(--bg-subtle); color:var(--text-muted);">📷</div>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fotoHtml}</td>
      <td>
        <strong style="color:var(--text-main); font-size:0.95rem;">${escapeHtml(p.nombre)}</strong>
        ${p.detalles_incluye ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(p.detalles_incluye)}</div>` : ''}
      </td>
      <td><span class="category-tag">${escapeHtml(p.categoria || 'General')}</span></td>
      <td class="mono">${fUSD(p.costo_usd)}</td>
      <td class="mono">${fQ(costoGtq)}</td>
      <td class="mono" style="font-weight:700; color:var(--text-main);">${fQ(p.precio_sugerido_gtq)}</td>
      <td><span class="profit-badge">+${fQ(ganancia)}</span></td>
      <td>
        <span class="stock-pill ${p.stock > 0 ? 'in-stock' : 'low-stock'}">
          ${p.stock} unid.
        </span>
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-primary btn-sm" onclick="venderArticuloDirecto(${p.id})" title="Registrar venta de este artículo">
          ⚡ Vender
        </button>
        <button class="btn btn-outline btn-sm" onclick="editarProducto(${p.id})" title="Editar artículo">
          ✏️
        </button>
        <button class="btn btn-danger-outline btn-sm" onclick="eliminarProducto(${p.id})" title="Eliminar artículo">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarProductos() {
  renderizarProductos();
}

function venderArticuloDirecto(prodId) {
  cambiarTab('tab-activas');
  abrirModalNuevaVenta(prodId);
}

function abrirModalProducto() {
  document.getElementById('formProducto').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('prodFotoUrl').value = '';
  document.getElementById('modalProductoTitulo').textContent = 'Nuevo Artículo en Inventario';
  
  appState.prodFotosEdicion = [];
  renderizarGridFotosEdicion();

  setCustomSelectValue('Consolas & Videojuegos');
  calcularMargenProductoModal();
  abrirModal('modalProducto');
}

function editarProducto(id) {
  const p = appState.productos.find(x => x.id === id);
  if (!p) return;

  document.getElementById('prodId').value = p.id;
  document.getElementById('prodNombre').value = p.nombre;
  setCustomSelectValue(p.categoria || 'Consolas & Videojuegos');
  document.getElementById('prodDetallesIncluye').value = p.detalles_incluye || '';
  document.getElementById('prodCostoUsd').value = p.costo_usd;
  document.getElementById('prodPrecioGtq').value = p.precio_sugerido_gtq;
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodFotoUrl').value = p.foto_url || '';

  // Cargar fotos existentes en array
  appState.prodFotosEdicion = [];
  if (p.foto_url) {
    appState.prodFotosEdicion = p.foto_url.split(',').map(s => s.trim()).filter(Boolean);
  }
  renderizarGridFotosEdicion();

  document.getElementById('modalProductoTitulo').textContent = 'Editar Artículo';
  calcularMargenProductoModal();
  abrirModal('modalProducto');
}

function calcularMargenProductoModal() {
  const usd = parseFloat(document.getElementById('prodCostoUsd').value) || 0;
  const gtq = parseFloat(document.getElementById('prodPrecioGtq').value) || 0;
  const costoGtq = usd * appState.tasaCambio;
  const margen = gtq - costoGtq;

  document.getElementById('previewProdGanancia').textContent = fQ(margen);
}

async function guardarProducto(e) {
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  const nombre = document.getElementById('prodNombre').value.trim();
  const categoria = document.getElementById('prodCategoria').value;
  const detalles = document.getElementById('prodDetallesIncluye').value.trim();
  const costoUsd = parseFloat(document.getElementById('prodCostoUsd').value) || 0;
  const precioGtq = parseFloat(document.getElementById('prodPrecioGtq').value) || 0;
  const stock = parseInt(document.getElementById('prodStock').value) || 0;

  const btn = document.getElementById('btnGuardarProd');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    // 1. Separar URLs ya existentes de nuevos archivos File
    const urlsFinales = [];
    const archivosNuevos = [];

    appState.prodFotosEdicion.forEach(item => {
      if (typeof item === 'string') {
        urlsFinales.push(item);
      } else if (item instanceof File) {
        archivosNuevos.push(item);
      }
    });

    // 2. Subir archivos nuevos si los hay
    if (archivosNuevos.length > 0) {
      const formData = new FormData();
      archivosNuevos.forEach(file => formData.append('files', file));
      const upRes = await fetch('/api/upload/articulos', { method: 'POST', body: formData });
      if (upRes.ok) {
        const upData = await upRes.json();
        if (upData.urls && Array.isArray(upData.urls)) {
          urlsFinales.push(...upData.urls);
        }
      }
    }

    const payload = {
      nombre,
      categoria,
      detalles_incluye: detalles,
      costo_usd: costoUsd,
      precio_sugerido_gtq: precioGtq,
      stock,
      foto_url: urlsFinales.join(',')
    };

    let url = '/api/productos';
    let method = 'POST';
    if (id) {
      url = `/api/productos/${id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Error al guardar artículo');
    
    cerrarModal('modalProducto');
    await cargarProductos();
    mostrarToast('Artículo guardado en el inventario con éxito', 'exito');
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Artículo';
  }
}

function eliminarProducto(id) {
  mostrarConfirmacion({
    titulo: '¿Eliminar este artículo?',
    mensaje: 'El artículo será removido del catálogo de inventario.',
    botonTexto: 'Sí, eliminar',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        await cargarProductos();
        mostrarToast('Artículo eliminado del inventario', 'exito');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    }
  });
}

// 6. DETALLES Y HISTORIAL DE ABONOS
async function abrirDetalleVenta(id) {
  try {
    const res = await fetch(`/api/ventas/${id}`);
    if (!res.ok) return;
    const v = await res.json();
    appState.ventaSeleccionada = v;

    document.getElementById('modalDetalleTitulo').textContent = `Historial: ${v.comprador_nombre}`;

    const infoBox = document.getElementById('detalleVentaInfo');
    infoBox.innerHTML = `
      <div class="saldo-resumen-box">
        <div>
          <span class="label">Total Acordado</span>
          <strong class="text-blue">${fQ(v.total_gtq)}</strong>
        </div>
        <div>
          <span class="label">Total Abonado</span>
          <strong class="text-green">${fQ(v.total_abonado)}</strong>
        </div>
        <div>
          <span class="label">Saldo Pendiente</span>
          <strong class="text-orange">${fQ(v.saldo_pendiente)}</strong>
        </div>
      </div>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">
        📅 Pago pactado: <strong>Día ${v.dia_pago_mes || 15} de cada mes</strong> | Tel: ${v.comprador_telefono || 'N/A'}
      </div>
    `;

    const tbody = document.getElementById('tablaHistorialAbonos');
    tbody.innerHTML = '';

    if (!v.abonos || v.abonos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">Aún no se han registrado abonos en esta venta.</td></tr>`;
    } else {
      v.abonos.forEach(a => {
        const tr = document.createElement('tr');
        const fotoBtn = a.foto_comprobante ? 
          `<button class="btn btn-outline btn-sm" onclick="abrirFotoFull('${a.foto_comprobante}', 'Comprobante Boleta')">🧾 Ver Boleta</button>` :
          `<span style="color:var(--text-muted); font-size:0.8rem;">Sin foto</span>`;

        tr.innerHTML = `
          <td><strong>${a.fecha_abono}</strong></td>
          <td class="mono" style="font-weight:700; color:var(--success);">${fQ(a.monto_gtq)}</td>
          <td>
            <div>${escapeHtml(a.metodo_pago)}</div>
            ${a.numero_boleta ? `<small class="mono" style="color:var(--text-muted);">No: ${escapeHtml(a.numero_boleta)}</small>` : ''}
          </td>
          <td>${fotoBtn}</td>
          <td style="text-align: right;">
            <button class="btn btn-danger-outline btn-sm" onclick="eliminarAbono(${a.id}, ${v.id})" title="Eliminar abono">
              🗑️
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    abrirModal('modalDetalleVenta');
  } catch (err) {
    console.error('Error cargando detalles:', err);
  }
}

function eliminarAbono(abonoId, ventaId) {
  mostrarConfirmacion({
    titulo: '¿Eliminar este abono?',
    mensaje: 'El saldo del crédito se recalculará automáticamente.',
    botonTexto: 'Sí, eliminar abono',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/abonos/${abonoId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar abono');
        await cargarDashboard();
        await cargarVentas();
        abrirDetalleVenta(ventaId);
        mostrarToast('Abono eliminado y saldo actualizado', 'exito');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    }
  });
}

// 7. IMPRIMIR RECIBO FORMAL
function imprimirRecibo() {
  const v = appState.ventaSeleccionada;
  if (!v) return;

  const abonosRows = (v.abonos || []).map((a, i) => `
    <tr>
      <td style="padding:6px; border-bottom:1px solid #ddd;">${i + 1}</td>
      <td style="padding:6px; border-bottom:1px solid #ddd;">${a.fecha_abono}</td>
      <td style="padding:6px; border-bottom:1px solid #ddd;">${a.metodo_pago} ${a.numero_boleta ? '(' + a.numero_boleta + ')' : ''}</td>
      <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">${fQ(a.monto_gtq)}</td>
    </tr>
  `).join('');

  const printArea = document.getElementById('areaImpresionRecibo');
  printArea.innerHTML = `
    <div style="font-family:sans-serif; max-width:650px; margin:20px auto; padding:25px; border:2px solid #333; border-radius:8px;">
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:12px; margin-bottom:15px;">
        <h2 style="margin:0; text-transform:uppercase;">COMPROBANTE DE VENTA & ESTADO DE CUENTA</h2>
        <p style="margin:4px 0 0 0; color:#555; font-size:14px;">Control de Créditos y Cobranzas</p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:14px;">
        <div>
          <p><strong>Cliente:</strong> ${escapeHtml(v.comprador_nombre)}</p>
          <p><strong>Teléfono:</strong> ${v.comprador_telefono || 'No registrado'}</p>
        </div>
        <div style="text-align:right;">
          <p><strong>Fecha Venta:</strong> ${v.fecha_venta}</p>
          <p><strong>Día de Pago Pactado:</strong> Días ${v.dia_pago_mes || 15} de cada mes</p>
        </div>
      </div>

      <div style="background:#f5f5f5; padding:10px; border-radius:4px; margin-bottom:15px; font-size:13px;">
        <p><strong>Artículo / Producto:</strong> ${v.items.map(i => i.descripcion).join(', ')}</p>
        ${v.detalles_entrega ? `<p><strong>Qué incluye:</strong> ${escapeHtml(v.detalles_entrega)}</p>` : ''}
      </div>

      <h4 style="margin:10px 0 5px 0;">Historial de Abonos:</h4>
      <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:15px;">
        <thead>
          <tr style="background:#eee; text-align:left;">
            <th style="padding:6px;">#</th>
            <th style="padding:6px;">Fecha</th>
            <th style="padding:6px;">Forma de Pago</th>
            <th style="padding:6px; text-align:right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${abonosRows || '<tr><td colspan="4" style="text-align:center; padding:10px;">Sin abonos registrados aún</td></tr>'}
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; margin-top:15px; border-top:2px solid #333; padding-top:10px;">
        <div style="text-align:right; width:100%; font-size:15px; line-height:1.6;">
          <div>Total de la Venta: <strong>${fQ(v.total_gtq)}</strong></div>
          <div style="color:green;">Total Abonado: <strong>${fQ(v.total_abonado)}</strong></div>
          <div style="font-size:18px; color:#d97706; margin-top:4px;">Saldo Pendiente: <strong>${fQ(v.saldo_pendiente)}</strong></div>
        </div>
      </div>

      <div style="margin-top:40px; display:flex; justify-content:space-between; text-align:center; font-size:12px;">
        <div style="width:200px; border-top:1px solid #333; padding-top:5px;">Firma Vendedor</div>
        <div style="width:200px; border-top:1px solid #333; padding-top:5px;">Firma Cliente</div>
      </div>
    </div>
  `;

  // Cerrar temporalmente el modal para que no se imprima el diálogo
  cerrarModal('modalDetalleVenta');

  setTimeout(() => {
    window.print();
    // Limpiar el contenido y restaurar
    setTimeout(() => {
      printArea.innerHTML = '';
      abrirModal('modalDetalleVenta');
    }, 400);
  }, 150);
}

// --- ARTÍCULOS VENDIDOS & ESTADÍSTICAS ---
async function cargarArticulosVendidos() {
  try {
    const res = await fetch('/api/articulos-vendidos');
    if (!res.ok) return;
    const data = await res.json();
    appState.articulosVendidos = data.articulos || [];
    appState.resumenVendidos = data.resumen || {};
    appState.rankingCategorias = data.ranking_categorias || [];

    // Actualizar contador de la pestaña
    const counterEl = document.getElementById('countVendidos');
    if (counterEl) counterEl.textContent = data.resumen.total_unidades_vendidas || 0;

    // Actualizar KPI cards
    const statUnidades = document.getElementById('statTotalVendidas');
    const statTop = document.getElementById('statCategoriaTop');
    const statIngresos = document.getElementById('statTotalIngresos');
    const statGanancia = document.getElementById('statTotalGanancia');

    if (statUnidades) statUnidades.textContent = data.resumen.total_unidades_vendidas || 0;
    if (statTop) statTop.textContent = data.resumen.categoria_top || 'N/A';
    if (statIngresos) statIngresos.textContent = fQ(data.resumen.total_ingresos_gtq || 0);
    if (statGanancia) statGanancia.textContent = fQ(data.resumen.total_ganancia_gtq || 0);

    // Actualizar desglose por categoría
    renderizarRankingCategorias();

    // Actualizar opciones del select de categorías
    actualizarFiltroCategoriasVendidos();

    // Renderizar tabla
    renderizarArticulosVendidos();
  } catch (err) {
    console.error('Error cargando artículos vendidos:', err);
  }
}

function renderizarRankingCategorias() {
  const cont = document.getElementById('contenedorStatsCategorias');
  if (!cont) return;
  cont.innerHTML = '';

  if (!appState.rankingCategorias || appState.rankingCategorias.length === 0) {
    cont.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding: 0.5rem 0;">Aún no se han registrado artículos vendidos.</p>';
    return;
  }

  appState.rankingCategorias.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'cat-stat-row';
    row.innerHTML = `
      <div class="cat-stat-header">
        <span>${escapeHtml(cat.categoria)} &bull; <strong>${cat.unidades} ${cat.unidades === 1 ? 'unidad' : 'unidades'}</strong> (${cat.porcentaje}%)</span>
        <span style="font-size:0.82rem; color:var(--text-muted);">
          Total: <strong style="color:var(--text-main);">${fQ(cat.total_gtq)}</strong> | Ganancia: <strong style="color:var(--success);">+${fQ(cat.ganancia_gtq)}</strong>
        </span>
      </div>
      <div class="cat-stat-bar-bg">
        <div class="cat-stat-bar-fill" style="width: ${Math.max(5, cat.porcentaje)}%"></div>
      </div>
    `;
    cont.appendChild(row);
  });
}

function actualizarFiltroCategoriasVendidos() {
  const sel = document.getElementById('filtroCategoriaVendidos');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Todas las Categorías</option>';

  const cats = [...new Set((appState.articulosVendidos || []).map(a => a.categoria || 'General'))].sort();
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.value = currentVal;
}

function renderizarArticulosVendidos() {
  const tbody = document.getElementById('tablaVendidosBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const q = (document.getElementById('busquedaVendidosInput')?.value || '').toLowerCase().trim();
  const catFiltro = document.getElementById('filtroCategoriaVendidos')?.value || '';

  const filtrados = (appState.articulosVendidos || []).filter(a => {
    const matchQ = (a.descripcion || '').toLowerCase().includes(q) ||
                   (a.comprador_nombre || '').toLowerCase().includes(q) ||
                   (a.categoria || '').toLowerCase().includes(q);
    const matchCat = !catFiltro || a.categoria === catFiltro;
    return matchQ && matchCat;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">
      No hay artículos vendidos que coincidan con la búsqueda.
    </td></tr>`;
    return;
  }

  filtrados.forEach(item => {
    const tr = document.createElement('tr');
    
    let fotosArr = [];
    if (item.foto_url) {
      fotosArr = item.foto_url.split(',').map(s => s.trim()).filter(Boolean);
    }
    const fotoHtml = fotosArr.length > 0 ?
      `<img src="${fotosArr[0]}" class="prod-thumb-mini" alt="${escapeHtml(item.descripcion)}" onclick="abrirFotoFull('${fotosArr.join(',')}', '${escapeHtml(item.descripcion)}')" style="cursor:pointer;" title="Ver imagen">` :
      `<div class="prod-thumb-mini" style="display:flex; align-items:center; justify-content:center; background:var(--bg-subtle); color:var(--text-muted);">📦</div>`;

    const estadoBadge = item.venta_estado === 'completada' ?
      `<span class="status-pill status-paid">Pagado 100%</span>` :
      `<span class="status-pill status-active">Crédito Activo</span>`;

    tr.innerHTML = `
      <td>${fotoHtml}</td>
      <td>
        <strong style="color:var(--text-main); font-size:0.92rem;">${escapeHtml(item.descripcion)}</strong>
      </td>
      <td><span class="category-tag">${escapeHtml(item.categoria)}</span></td>
      <td>
        <div style="font-weight:600;">${escapeHtml(item.comprador_nombre)}</div>
        ${item.comprador_telefono ? `<small style="color:var(--text-muted);">${escapeHtml(item.comprador_telefono)}</small>` : ''}
      </td>
      <td class="mono" style="font-size:0.85rem;">${item.fecha_venta}</td>
      <td class="mono" style="font-weight:700;">${item.cantidad} unid.</td>
      <td class="mono" style="font-weight:700; color:var(--text-main);">${fQ(item.precio_unitario_gtq)}</td>
      <td><span class="profit-badge">+${fQ(item.ganancia_gtq)}</span></td>
      <td>${estadoBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarVendidos() {
  renderizarArticulosVendidos();
}

// 8. TASA DE CAMBIO
async function guardarTasa(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById('nuevaTasaInput').value);
  if (!val || val <= 0) return;

  try {
    const res = await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasa_cambio: val })
    });
    if (!res.ok) throw new Error('Error al actualizar tasa');
    cerrarModal('modalTasa');
    await cargarDashboard();
    await cargarProductos();
    await cargarVentas();
    mostrarToast(`Tipo de cambio actualizado a Q${val.toFixed(2)}`, 'exito');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

// 9. MODAL VER FOTO / GALERÍA
function abrirFotoFull(urlsString, titulo) {
  if (!urlsString) return;
  const urls = urlsString.split(',').map(s => s.trim()).filter(Boolean);
  if (urls.length === 0) return;

  const mainImg = document.getElementById('imgComprobanteFull');
  const thumbsBox = document.getElementById('galeriaThumbsContainer');
  const btnDescarga = document.getElementById('btnDescargarFoto');

  mainImg.src = urls[0];
  btnDescarga.href = urls[0];
  document.getElementById('modalVerFotoTitulo').textContent = titulo || 'Foto del Artículo';

  thumbsBox.innerHTML = '';
  if (urls.length > 1) {
    urls.forEach((url, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'multi-preview-item';
      thumb.style.cursor = 'pointer';
      thumb.innerHTML = `<img src="${url}" alt="Foto ${i + 1}">`;
      thumb.onclick = () => {
        mainImg.src = url;
        btnDescarga.href = url;
      };
      thumbsBox.appendChild(thumb);
    });
    thumbsBox.classList.remove('hidden');
  } else {
    thumbsBox.classList.add('hidden');
  }

  abrirModal('modalVerFoto');
}

// 10. MODAL UTILITIES
function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) m.showModal();
}

function cerrarModal(id) {
  const m = document.getElementById(id);
  if (m) m.close();
}

function abrirModalAjustes() {
  abrirModal('modalAjustes');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
