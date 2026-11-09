/**
 * @file app.js
 * @description Controlador principal del Frontend Dashboard.
 * Coordina la carga de datos de la API, las pestañas de navegación y los eventos en tiempo real.
 */

// Estado global en memoria para reactividad
const state = {
  dbStats: null,
  kpis: {
    ingresos: 0,
    compras: 0,
    ticketPromedio: 0
  },
  topProductos: [],
  transaccionesRecientes: []
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[APP] Inicializando Dashboard de Comercio Electrónico...');

  // 1. Configurar navegación de pestañas
  configurarTabs();

  // 2. Inicializar módulo NLP (Informe 9)
  inicializarModuloNLP();

  // 3. Inicializar WebSocket con callbacks de reactividad
  inicializarWebSocket({
    onNuevaTransaccion: handleNuevaTransaccion,
    onIncrementoVenta: handleIncrementoVenta
  });

  // 4. Carga inicial de datos desde la API
  await cargarEstadisticasDB();
  await cargarInforme1Ventas();
  await cargarInforme2TopProductos();
  await cargarInforme10EventosRecientes();
  await cargarInforme3Marcas();
  await cargarInforme4Categorias();
  await cargarInforme5Clientes();
  await cargarInforme6Embudo();
  await cargarInforme7Horarios();
  await cargarInforme8Disminucion();

  // Actualizar estadísticas de base de datos cada 30 segundos
  setInterval(cargarEstadisticasDB, 30000);
});

function configurarTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// --------------------------------------------------------------------------
// CARGA DE DATOS DESDE LA API
// --------------------------------------------------------------------------

async function cargarEstadisticasDB() {
  try {
    const stats = await api.getStats();
    state.dbStats = stats;

    const elDataSize = document.getElementById('stat-datasize');
    const elStorageSize = document.getElementById('stat-storagesize');
    const elTotalDocs = document.getElementById('stat-totaldocs');
    const elDbName = document.getElementById('stat-dbname');

    if (elDataSize) elDataSize.innerText = `${stats.dataSizeGB.toFixed(2)} GB`;
    if (elStorageSize) elStorageSize.innerText = `${stats.storageSizeGB.toFixed(2)} GB`;
    if (elTotalDocs) elTotalDocs.innerText = stats.totalDocumentos.toLocaleString();
    if (elDbName) elDbName.innerText = stats.dbName;

    // Verificar si ya superamos la meta de 20 GB
    const badgeMeta = document.getElementById('badge-meta-20gb');
    if (badgeMeta) {
      if (stats.dataSizeGB >= 20.0) {
        badgeMeta.innerText = 'Meta Alcanzada: ≥ 20 GB';
        badgeMeta.className = 'badge badge-live';
      } else {
        badgeMeta.innerText = `Cargando volumen (${stats.dataSizeGB.toFixed(1)} / 20.0 GB)`;
        badgeMeta.className = 'badge badge-db';
      }
    }
  } catch (err) {
    console.error('Error cargando stats de DB:', err);
  }
}

async function cargarInforme1Ventas() {
  try {
    const data = await api.getInforme1Ventas();
    state.kpis.ingresos = data.kpis.ingresos_totales;
    state.kpis.compras = data.kpis.compras_totales;
    state.kpis.ticketPromedio = data.kpis.ticket_promedio_general;

    actualizarTarjetasKPI();

    // Renderizar gráfico de ventas diarias
    const ctx = document.getElementById('chart-ventas-periodo');
    if (ctx && data.serie_diaria.length > 0) {
      const labels = data.serie_diaria.map((d) => d.fecha);
      const ingresos = data.serie_diaria.map((d) => d.ingresos);
      const compras = data.serie_diaria.map((d) => d.total_compras);
      renderChartVentas(ctx, labels, ingresos, compras);
    }
  } catch (err) {
    console.error('Error cargando Informe 1:', err);
  }
}

async function cargarInforme2TopProductos() {
  try {
    const productos = await api.getInforme2TopProductos(10);
    state.topProductos = productos;

    const ctx = document.getElementById('chart-top-productos');
    if (ctx && productos.length > 0) {
      const labels = productos.map((p) => `${p.marca.toUpperCase()} (#${p.product_id})`);
      const unidades = productos.map((p) => p.unidades_vendidas);
      const ingresos = productos.map((p) => p.ingresos_generados);
      renderChartTopProductos(ctx, labels, unidades, ingresos);
    }
  } catch (err) {
    console.error('Error cargando Informe 2:', err);
  }
}

async function cargarInforme10EventosRecientes() {
  try {
    const eventos = await api.getInforme10EventosRecientes(15);
    state.transaccionesRecientes = eventos;
    renderizarTablaTransacciones();
  } catch (err) {
    console.error('Error cargando Informe 10:', err);
  }
}

async function cargarInforme3Marcas() {
  try {
    const marcas = await api.getInforme3Marcas(10);
    const ctx = document.getElementById('chart-marcas-rentables');
    if (ctx && marcas.length > 0) {
      const labels = marcas.map((m) => m.marca.toUpperCase());
      const ingresos = marcas.map((m) => m.ingresos_totales);
      renderChartMarcas(ctx, labels, ingresos);
    }

    const tbody = document.getElementById('tabla-marcas-body');
    if (tbody) {
      tbody.innerHTML = marcas
        .map(
          (m, idx) => `
        <tr>
          <td><strong>#${idx + 1}</strong> ${m.marca.toUpperCase()}</td>
          <td style="color: #10b981; font-weight: 600;">$${m.ingresos_totales.toLocaleString()}</td>
          <td>${m.total_ventas.toLocaleString()}</td>
          <td>$${m.ticket_promedio.toFixed(2)}</td>
        </tr>
      `
        )
        .join('');
    }
  } catch (err) {
    console.error('Error cargando Informe 3:', err);
  }
}

async function cargarInforme4Categorias() {
  try {
    const categorias = await api.getInforme4Categorias(8);
    const ctx = document.getElementById('chart-categorias');
    if (ctx && categorias.length > 0) {
      const labels = categorias.map((c) => c.categoria);
      const ingresos = categorias.map((c) => c.ingresos_totales);
      renderChartCategorias(ctx, labels, ingresos);
    }
  } catch (err) {
    console.error('Error cargando Informe 4:', err);
  }
}

async function cargarInforme5Clientes() {
  try {
    const clientes = await api.getInforme5Clientes(10);
    const tbody = document.getElementById('tabla-clientes-body');
    if (tbody) {
      tbody.innerHTML = clientes
        .map(
          (c, idx) => `
        <tr>
          <td><span class="badge ${idx < 3 ? 'badge-live' : 'badge-db'}">VIP #${idx + 1}</span> ${c.user_id}</td>
          <td style="color: #06b6d4; font-weight: 700;">$${c.gasto_total.toLocaleString()}</td>
          <td><strong>${c.total_compras}</strong> compras</td>
          <td>$${c.ticket_promedio.toFixed(2)}</td>
          <td>${new Date(c.ultima_compra).toLocaleDateString()}</td>
        </tr>
      `
        )
        .join('');
    }
  } catch (err) {
    console.error('Error cargando Informe 5:', err);
  }
}

async function cargarInforme6Embudo() {
  try {
    const data = await api.getInforme6Embudo();
    const contenedor = document.getElementById('funnel-container');
    const metricasContenedor = document.getElementById('funnel-metrics');

    if (contenedor && data.etapas) {
      contenedor.innerHTML = data.etapas
        .map(
          (e) => `
        <div class="funnel-step">
          <div class="funnel-bar" style="width: ${Math.max(e.porcentaje_relativo, 5)}%;"></div>
          <div class="funnel-content">
            <div>
              <strong>${e.etapa}</strong>
              <div style="font-size: 0.8rem; color: #9ca3af;">${e.porcentaje_relativo}% relativo</div>
            </div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #06b6d4;">
              ${e.cantidad.toLocaleString()}
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }

    if (metricasContenedor && data.metricas) {
      document.getElementById('m-conv-global').innerText = `${data.metricas.tasa_conversion_global_pct}%`;
      document.getElementById('m-conv-cart').innerText = `${data.metricas.tasa_conversion_carrito_pct}%`;
      document.getElementById('m-aban-cart').innerText = `${data.metricas.tasa_abandono_carrito_pct}%`;
    }
  } catch (err) {
    console.error('Error cargando Informe 6:', err);
  }
}

async function cargarInforme7Horarios() {
  try {
    const data = await api.getInforme7Horarios();
    const contenedor = document.getElementById('heatmap-grid');
    if (!contenedor) return;

    // Matriz de 7 días x 24 horas
    const matriz = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxTransacciones = 1;

    for (const item of data) {
      const d = item.dia_semana - 1; // 0 a 6
      const h = item.hora;           // 0 a 23
      if (d >= 0 && d < 7 && h >= 0 && h < 24) {
        matriz[d][h] = item.transacciones;
        if (item.transacciones > maxTransacciones) {
          maxTransacciones = item.transacciones;
        }
      }
    }

    const nombresDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    let html = '<div></div>'; // Esquina vacía
    for (let h = 0; h < 24; h++) {
      html += `<div style="text-align: center; font-size: 0.7rem; color: #9ca3af;">${h}h</div>`;
    }

    for (let d = 0; d < 7; d++) {
      html += `<div style="font-weight: 600; font-size: 0.8rem; display: flex; align-items: center;">${nombresDias[d]}</div>`;
      for (let h = 0; h < 24; h++) {
        const val = matriz[d][h];
        const intensidad = (val / maxTransacciones) * 0.9 + 0.1;
        const color = val > 0 ? `rgba(6, 182, 212, ${intensidad.toFixed(2)})` : 'rgba(255,255,255,0.03)';
        html += `
          <div class="heatmap-cell" style="background-color: ${color};" title="${nombresDias[d]} ${h}:00 - ${val.toLocaleString()} compras">
            ${val > 0 ? (val > 999 ? (val / 1000).toFixed(1) + 'k' : val) : ''}
          </div>
        `;
      }
    }

    contenedor.innerHTML = html;
  } catch (err) {
    console.error('Error cargando Informe 7:', err);
  }
}

async function cargarInforme8Disminucion() {
  try {
    const productos = await api.getInforme8Disminucion(null, 8);
    const ctx = document.getElementById('chart-disminucion-demanda');
    if (ctx && productos.length > 0) {
      const labels = productos.map((p) => `${p.marca.toUpperCase()} (#${p.product_id})`);
      const p1 = productos.map((p) => p.ventas_periodo_1);
      const p2 = productos.map((p) => p.ventas_periodo_2);
      renderChartDisminucion(ctx, labels, p1, p2);
    }
  } catch (err) {
    console.error('Error cargando Informe 8:', err);
  }
}

// --------------------------------------------------------------------------
// ACTUALIZACIONES EN TIEMPO REAL (SOCKET.IO & CHANGE STREAMS)
// --------------------------------------------------------------------------

function handleNuevaTransaccion(t) {
  // Agregar al inicio del arreglo del Informe 10
  state.transaccionesRecientes.unshift(t);
  if (state.transaccionesRecientes.length > 25) {
    state.transaccionesRecientes.pop();
  }
  renderizarTablaTransacciones(true);
}

function handleIncrementoVenta(datos) {
  // Bumps en los KPIs del Informe 1
  state.kpis.ingresos += datos.monto;
  state.kpis.compras += 1;
  state.kpis.ticketPromedio = state.kpis.ingresos / state.kpis.compras;
  actualizarTarjetasKPI();
}

function actualizarTarjetasKPI() {
  const elIngresos = document.getElementById('kpi-ingresos-totales');
  const elCompras = document.getElementById('kpi-compras-totales');
  const elTicket = document.getElementById('kpi-ticket-promedio');

  if (elIngresos) elIngresos.innerText = `$${state.kpis.ingresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (elCompras) elCompras.innerText = state.kpis.compras.toLocaleString();
  if (elTicket) elTicket.innerText = `$${state.kpis.ticketPromedio.toFixed(2)}`;
}

function renderizarTablaTransacciones(highlightFirst = false) {
  const tbody = document.getElementById('tabla-transacciones-body');
  if (!tbody) return;

  tbody.innerHTML = state.transaccionesRecientes
    .map((t, idx) => {
      const esNueva = highlightFirst && idx === 0;
      const fecha = new Date(t.event_time).toLocaleTimeString();
      return `
        <tr class="${esNueva ? 'row-new' : ''}">
          <td><span style="font-family: var(--font-mono); color: #06b6d4;">${fecha}</span></td>
          <td><strong>${(t.brand || 'GENÉRICO').toUpperCase()}</strong> (#${t.product_id})</td>
          <td><span style="color: #9ca3af; font-size: 0.85rem;">${t.category_code || 'General'}</span></td>
          <td style="color: #10b981; font-weight: 700;">$${Number(t.price).toFixed(2)}</td>
          <td><span style="color: #9ca3af;">${t.user_id}</span></td>
          <td><span class="badge badge-live">COMPRA EXITOSA</span></td>
        </tr>
      `;
    })
    .join('');
}
