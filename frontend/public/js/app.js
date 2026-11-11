const state = {
  dbStats: null,
  kpis: { ingresos: 0, viajes: 0, tarifaPromedio: 0 },
  zonasRecogida: [],
  viajesRecientes: [],
  loadedTabs: new Set(),
  live: false
};

const METODOS_PAGO = {
  1: 'Tarjeta de crédito',
  2: 'Efectivo',
  3: 'Sin cargo',
  4: 'Disputa',
  5: 'Desconocido',
  6: 'Viaje anulado'
};

document.addEventListener('DOMContentLoaded', async () => {
  configurarTabs();
  configurarSidebar();
  inicializarModuloNLP();
  inicializarWebSocket({
    onNuevoViaje: manejarNuevoViaje,
    onIncrementoViaje: manejarIncrementoViaje,
    onEstadoBD: (live) => actualizarEstadoSocket(live)
  });
  await cargarEstadisticasDB();
  await cargarPestana('tab-tiempo-real');
  setInterval(cargarEstadisticasDB, 30000);
});

function configurarTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId)?.classList.add('active');
      document.getElementById('page-title').textContent = button.dataset.title;
      if (window.matchMedia('(max-width: 900px)').matches) {
        document.body.classList.remove('sidebar-open');
        document.getElementById('sidebar-toggle').setAttribute('aria-expanded', 'false');
      }
      await cargarPestana(tabId);
    });
  });
}

function configurarSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const mobile = window.matchMedia('(max-width: 900px)');
  const setExpanded = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  };

  setExpanded(!mobile.matches);
  toggle.addEventListener('click', () => {
    if (mobile.matches) {
      document.body.classList.toggle('sidebar-open');
      setExpanded(document.body.classList.contains('sidebar-open'));
      return;
    }

    document.body.classList.toggle('sidebar-collapsed');
    setExpanded(!document.body.classList.contains('sidebar-collapsed'));
  });
  overlay.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    setExpanded(false);
  });
  mobile.addEventListener('change', (event) => {
    document.body.classList.remove('sidebar-open', 'sidebar-collapsed');
    setExpanded(!event.matches);
  });
}

async function cargarPestana(tabId) {
  if (state.loadedTabs.has(tabId)) return;
  const reportes = [];

  if (tabId === 'tab-tiempo-real') {
    reportes.push(
      {
        elemento: 'chart-viajes-periodo',
        nombre: 'Informe 1',
        solicitud: api.getInforme1Viajes(),
        renderizar: actualizarResumen
      },
      {
        elemento: 'chart-top-zonas',
        nombre: 'Informe 2',
        solicitud: api.getInforme2Zonas(),
        renderizar: (zonas) => {
          state.zonasRecogida = zonas;
          renderizarZonas();
        }
      },
      {
        elemento: 'tabla-viajes-body',
        nombre: 'Informe 10',
        solicitud: api.getInforme10ViajesRecientes(),
        renderizar: (viajes) => {
          state.viajesRecientes = viajes;
          renderizarViajes();
        }
      }
    );
  } else if (tabId === 'tab-comercial') {
    reportes.push(
      {
        elemento: 'chart-rutas-populares',
        nombre: 'Informe 3',
        solicitud: api.getInforme3Rutas(),
        renderizar: renderizarRutas
      },
      {
        elemento: 'chart-ingresos-distrito',
        nombre: 'Informe 4',
        solicitud: api.getInforme4Distritos(),
        renderizar: renderizarDistritos
      },
      {
        elemento: 'tabla-pagos-body',
        nombre: 'Informe 5',
        solicitud: api.getInforme5Pagos(),
        renderizar: renderizarPagos
      }
    );
  } else if (tabId === 'tab-distancias-horarios') {
    reportes.push(
      {
        elemento: 'chart-distancias',
        nombre: 'Informe 6',
        solicitud: api.getInforme6Distancias(),
        renderizar: renderizarDistancias
      },
      {
        elemento: 'heatmap-grid',
        nombre: 'Informe 7',
        solicitud: api.getInforme7Horarios(),
        renderizar: renderizarDemanda
      },
      {
        elemento: 'chart-propinas',
        nombre: 'Informe 8',
        solicitud: api.getInforme8Propinas(),
        renderizar: renderizarPropinas
      }
    );
  } else {
    return;
  }

  const resultados = await Promise.allSettled(reportes.map((reporte) => reporte.solicitud));
  let todosRenderizados = true;
  resultados.forEach((resultado, indice) => {
    const reporte = reportes[indice];
    try {
      if (resultado.status === 'rejected') {
        throw resultado.reason;
      }

      reporte.renderizar(resultado.value);
      limpiarErrorInforme(reporte.elemento);
    } catch (error) {
      todosRenderizados = false;
      const message = error?.message || String(error);
      console.error(`[DASHBOARD] ${reporte.nombre}: ${message}`);
      mostrarErrorInforme(reporte.elemento, reporte.nombre, message);
    }
  });

  if (todosRenderizados) {
    state.loadedTabs.add(tabId);
  }
}

async function cargarEstadisticasDB() {
  try {
    const stats = await api.getStats();
    state.dbStats = stats;
    document.getElementById('stat-datasize').innerText = `${stats.dataSizeGB.toFixed(2)} GiB`;
    document.getElementById('stat-storagesize').innerText = `${stats.storageSizeGB.toFixed(2)} GiB`;
    document.getElementById('stat-totaldocs').innerText = stats.totalDocumentos.toLocaleString();
    document.getElementById('stat-dbname').innerText = stats.dbName;

    const badge = document.getElementById('badge-meta-20gb');
    if (stats.dataSizeGB >= 20) {
      badge.innerText = 'Meta alcanzada: ≥ 20 GiB';
      badge.className = 'badge badge-live';
    } else {
      badge.innerText = `${stats.dataSizeGB.toFixed(2)} / 20 GiB`;
      badge.className = 'badge badge-db';
    }
  } catch (error) {
    console.error(`[DASHBOARD] No se pudieron cargar estadísticas: ${error.message}`);
  }
}

function actualizarResumen(data) {
  state.kpis.ingresos = data.kpis.ingresos_totales;
  state.kpis.viajes = data.kpis.total_viajes;
  state.kpis.tarifaPromedio = data.kpis.tarifa_promedio;
  actualizarTarjetasKPI();

  if (data.serie_diaria.length) {
    renderChartVentas(
      document.getElementById('chart-viajes-periodo'),
      data.serie_diaria.map((item) => item.fecha),
      data.serie_diaria.map((item) => item.ingresos),
      data.serie_diaria.map((item) => item.viajes)
    );
  }
}

function renderizarZonas(zonas = state.zonasRecogida) {
  if (!zonas.length) return;
  renderChartTopZonas(
    document.getElementById('chart-top-zonas'),
    zonas.map((item) => `${item.zona} (${item.borough})`),
    zonas.map((item) => item.viajes)
  );
}

function renderizarRutas(rutas) {
  const tbody = document.getElementById('tabla-rutas-body');
  const rows = rutas.map((item) => ({
    ruta: `${item.origen} → ${item.destino}`,
    ingresos: money(item.ingresos),
    viajes: item.viajes.toLocaleString(),
    distancia: `${item.distancia_promedio.toFixed(2)} mi`
  }));
  llenarTabla(tbody, rows, 'ruta', ['ruta', 'ingresos', 'viajes', 'distancia']);
  if (rutas.length) {
    renderChartRutas(
      document.getElementById('chart-rutas-populares'),
      rutas.slice(0, 10).map((item) => `${item.origen} → ${item.destino}`),
      rutas.slice(0, 10).map((item) => item.viajes)
    );
  }
}

function renderizarDistritos(distritos) {
  if (distritos.length) {
    renderChartIngresosDistritos(
      document.getElementById('chart-ingresos-distrito'),
      distritos.map((item) => item.borough),
      distritos.map((item) => item.ingresos)
    );
  }
}

function renderizarPagos(pagos) {
  const tbody = document.getElementById('tabla-pagos-body');
  const rows = pagos.map((item) => ({
    metodo: METODOS_PAGO[item.payment_type] || `Tipo ${item.payment_type ?? 'N/D'}`,
    viajes: item.viajes.toLocaleString(),
    ingresos: money(item.ingresos),
    tarifa: money(item.tarifa_promedio)
  }));
  llenarTabla(tbody, rows, 'metodo', ['metodo', 'viajes', 'ingresos', 'tarifa']);
}

function renderizarDistancias(distancias) {
  if (!distancias.length) return;
  const labels = distancias.map((item, index) => {
    const start = item.distancia_min_millas;
    const next = distancias[index + 1]?.distancia_min_millas;
    return typeof start === 'number' && next ? `${start}-${next} mi` : `${start}+ mi`;
  });
  renderChartDistancias(
    document.getElementById('chart-distancias'),
    labels,
    distancias.map((item) => item.viajes)
  );
}

function renderizarDemanda(data) {
  const grid = document.getElementById('heatmap-grid');
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  const maxTrips = Math.max(1, ...data.map((item) => item.viajes));
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  for (const item of data) matrix[item.dia_semana - 1][item.hora] = item.viajes;

  let html = '<div></div>';
  for (let hour = 0; hour < 24; hour++) html += `<div style="text-align:center;font-size:.7rem">${hour}h</div>`;
  for (let day = 0; day < 7; day++) {
    html += `<div style="font-weight:600;display:flex;align-items:center">${days[day]}</div>`;
    for (let hour = 0; hour < 24; hour++) {
      const trips = matrix[day][hour];
      const alpha = trips ? (0.1 + (trips / maxTrips) * 0.9).toFixed(2) : '0.03';
      html += `<div class="heatmap-cell" style="background:rgba(242,183,5,${alpha})" title="${days[day]} ${hour}:00 · ${trips.toLocaleString()} viajes">${trips ? compact(trips) : ''}</div>`;
    }
  }
  grid.innerHTML = html;
}

function renderizarPropinas(data) {
  if (data.length) {
    renderChartPropinas(
      document.getElementById('chart-propinas'),
      data.map((item) => `${item.zona} (${item.borough})`),
      data.map((item) => item.porcentaje_propina)
    );
  }
}

function actualizarEstadoSocket(live) {
  state.live = live;
  const statusDot = document.getElementById('socket-status-dot');
  const statusText = document.getElementById('socket-status-text');
  statusDot?.classList.toggle('online', live);
  if (statusText) statusText.innerText = live ? 'En vivo' : 'Conexión no disponible';
}

function manejarNuevoViaje(viaje) {
  state.viajesRecientes.unshift(viaje);
  state.viajesRecientes = state.viajesRecientes.slice(0, 25);
  renderizarViajes(true);
}

function manejarIncrementoViaje(datos) {
  state.kpis.ingresos += datos.total_amount;
  state.kpis.viajes += 1;
  state.kpis.tarifaPromedio = state.kpis.ingresos / state.kpis.viajes;
  actualizarTarjetasKPI();

  const zone = state.zonasRecogida.find((item) => item.location_id === datos.pickup_location_id);
  if (zone) zone.viajes += 1;
  else state.zonasRecogida.push({
    location_id: datos.pickup_location_id,
    zona: `Zona #${datos.pickup_location_id}`,
    borough: 'NYC',
    viajes: 1
  });
  state.zonasRecogida.sort((a, b) => b.viajes - a.viajes);
  state.zonasRecogida = state.zonasRecogida.slice(0, 10);
  if (state.loadedTabs.has('tab-tiempo-real')) renderizarZonas();
}

function actualizarTarjetasKPI() {
  document.getElementById('kpi-ingresos-totales').innerText = money(state.kpis.ingresos);
  document.getElementById('kpi-viajes-totales').innerText = state.kpis.viajes.toLocaleString();
  document.getElementById('kpi-tarifa-promedio').innerText = money(state.kpis.tarifaPromedio);
}

function renderizarViajes(highlightFirst = false) {
  const tbody = document.getElementById('tabla-viajes-body');
  tbody.replaceChildren();
  for (const [index, viaje] of state.viajesRecientes.entries()) {
    const row = document.createElement('tr');
    if (highlightFirst && index === 0) row.classList.add('row-new');
    const values = [
      new Date(viaje.pickup_datetime).toLocaleString(),
      viaje.origen || `Zona #${viaje.pickup_location_id}`,
      viaje.destino || `Zona #${viaje.dropoff_location_id}`,
      `${Number(viaje.trip_distance || 0).toFixed(2)} mi`,
      money(viaje.total_amount),
      viaje.passenger_count ?? 'N/D'
    ];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

function llenarTabla(tbody, rows, emptyLabel, keys) {
  tbody.replaceChildren();
  for (const item of rows) {
    const row = document.createElement('tr');
    for (const key of keys) {
      const cell = document.createElement('td');
      cell.textContent = item[key];
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = keys.length;
    cell.textContent = `Sin resultados para ${emptyLabel}.`;
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

function mostrarErrorInforme(elementoId, nombre, message) {
  const element = document.getElementById(elementoId);
  const card = element?.closest('.card');
  if (!card) return;

  let notice = card.querySelector('.report-error');
  if (!notice) {
    notice = document.createElement('p');
    notice.className = 'report-error';
    notice.setAttribute('role', 'status');
    card.prepend(notice);
  }
  notice.textContent = `${nombre}: no se pudieron cargar los datos. ${message}`;
}

function limpiarErrorInforme(elementoId) {
  document.getElementById(elementoId)?.closest('.card')?.querySelector('.report-error')?.remove();
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compact(value) {
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
}
