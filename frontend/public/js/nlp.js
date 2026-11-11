function inicializarModuloNLP() {
  const input = document.getElementById('nlp-input-pregunta');
  const button = document.getElementById('nlp-btn-consultar');
  const provider = document.getElementById('nlp-select-proveedor');
  const pipeline = document.getElementById('nlp-visor-pipeline');
  const stats = document.getElementById('nlp-stats-info');
  const results = document.getElementById('nlp-tabla-resultados');

  document.querySelectorAll('.query-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.getAttribute('data-query');
      runQuery();
    });
  });
  button.addEventListener('click', runQuery);
  input.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') runQuery();
  });

  async function runQuery() {
    const question = input.value.trim();
    if (!question) return;
    button.disabled = true;
    stats.textContent = 'Interpretando la pregunta y consultando MongoDB...';
    pipeline.textContent = '// Ejecutando consulta en la colección yellow_trips...';
    try {
      const data = await api.postInforme9NLP(question, provider.value);
      pipeline.textContent = JSON.stringify(data.pipeline_generado, null, 2);
      stats.textContent =
        `${data.proveedor_utilizado} · ${data.tiempo_ejecucion_ms} ms · ` +
        `${data.total_resultados} resultados`;
      renderizarTablaDinamica(results, data.resultados);
    } catch (error) {
      pipeline.textContent = `// ERROR: ${error.message}`;
      stats.textContent = error.message;
      renderizarTablaDinamica(results, []);
    } finally {
      button.disabled = false;
    }
  }

  const zoneInput = document.getElementById('zone-search-input');
  const zoneButton = document.getElementById('zone-search-button');
  const zoneBody = document.getElementById('zone-search-body');
  zoneButton.addEventListener('click', searchZones);
  zoneInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') searchZones();
  });

  async function searchZones() {
    const query = zoneInput.value.trim();
    if (!query) return;
    zoneButton.disabled = true;
    zoneButton.textContent = 'Buscando...';
    try {
      const zones = await api.buscarZonas(query);
      zoneBody.replaceChildren();
      for (const zone of zones) {
        const row = document.createElement('tr');
        for (const value of [zone._id, zone.zone, zone.borough, zone.service_zone]) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        }
        zoneBody.appendChild(row);
      }
      if (!zones.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No se encontraron zonas.';
        row.appendChild(cell);
        zoneBody.appendChild(row);
      }
    } catch (error) {
      zoneBody.textContent = error.message;
    } finally {
      zoneButton.disabled = false;
      zoneButton.textContent = 'Buscar zona';
    }
  }
}

function renderizarTablaDinamica(table, rows) {
  table.replaceChildren();
  if (!rows.length) {
    const body = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 1;
    cell.textContent = 'La consulta no arrojó resultados.';
    row.appendChild(cell);
    body.appendChild(row);
    table.appendChild(body);
    return;
  }

  const columns = Object.keys(rows[0]);
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of columns) {
    const cell = document.createElement('th');
    cell.textContent = column;
    headRow.appendChild(cell);
  }
  head.appendChild(headRow);
  const body = document.createElement('tbody');
  for (const item of rows) {
    const row = document.createElement('tr');
    for (const column of columns) {
      const cell = document.createElement('td');
      const value = item[column];
      cell.textContent = typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value ?? '-');
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  table.append(head, body);
}
