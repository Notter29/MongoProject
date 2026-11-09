/**
 * @file nlp.js
 * @description Módulo para el Informe 9: Consultas en Lenguaje Natural (Text-to-Aggregation).
 * Soporta selección dinámica entre Google Gemini y Ollama Local (Qwen 2.5).
 */

function inicializarModuloNLP() {
  const btnConsultar = document.getElementById('nlp-btn-consultar');
  const inputPregunta = document.getElementById('nlp-input-pregunta');
  const selectProveedor = document.getElementById('nlp-select-proveedor');
  const visorPipeline = document.getElementById('nlp-visor-pipeline');
  const statsInfo = document.getElementById('nlp-stats-info');
  const tablaResultados = document.getElementById('nlp-tabla-resultados');
  const chips = document.querySelectorAll('.query-chip');

  // Asignar clic a las preguntas sugeridas
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const texto = chip.getAttribute('data-query');
      if (inputPregunta && texto) {
        inputPregunta.value = texto;
        ejecutarConsultaNLP();
      }
    });
  });

  if (btnConsultar) {
    btnConsultar.addEventListener('click', ejecutarConsultaNLP);
  }

  if (inputPregunta) {
    inputPregunta.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        ejecutarConsultaNLP();
      }
    });
  }

  async function ejecutarConsultaNLP() {
    const pregunta = inputPregunta.value.trim();
    if (!pregunta) {
      alert('Por favor, ingresa una pregunta en lenguaje natural.');
      return;
    }

    const proveedor = selectProveedor ? selectProveedor.value : 'gemini';

    // Estado visual de carga
    btnConsultar.disabled = true;
    btnConsultar.innerText = 'Traduciendo y ejecutando...';
    visorPipeline.innerText = '// Enviando pregunta a la IA (' + proveedor.toUpperCase() + ') para generar el Aggregation Pipeline...';
    statsInfo.innerHTML = '<span style="color: #f59e0b;">⏳ Procesando consulta sobre los 20 GB de datos...</span>';
    tablaResultados.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #9ca3af;">Ejecutando en MongoDB...</td></tr>';

    try {
      const data = await api.postInforme9NLP(pregunta, proveedor);

      // 1. Mostrar el Pipeline JSON generado
      visorPipeline.innerText = JSON.stringify(data.pipeline_generado, null, 2);

      // 2. Mostrar estadísticas
      statsInfo.innerHTML = `
        <span style="color: #10b981; font-weight: 600;">✓ Consulta completada con éxito</span> |
        <strong>Proveedor:</strong> ${data.proveedor_utilizado} |
        <strong>Tiempo de ejecución en MongoDB:</strong> <span style="color: #06b6d4;">${data.tiempo_ejecucion_ms} ms</span> |
        <strong>Resultados obtenidos:</strong> ${data.total_resultados} registros
      `;

      // 3. Renderizar resultados dinámicos en la tabla
      renderizarResultadosEnTabla(data.resultados, tablaResultados);

    } catch (err) {
      console.error('[NLP ERROR]', err);
      visorPipeline.innerText = `// ERROR:\n${err.message}`;
      statsInfo.innerHTML = `<span style="color: #ef4444; font-weight: 600;">✗ Error:</span> ${err.message}`;
      tablaResultados.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">No se pudieron obtener resultados: ${err.message}</td></tr>`;
    } finally {
      btnConsultar.disabled = false;
      btnConsultar.innerText = 'Consultar con IA';
    }
  }

  function renderizarResultadosEnTabla(resultados, contenedor) {
    if (!resultados || resultados.length === 0) {
      contenedor.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #9ca3af;">La consulta no arrojó ningún documento.</td></tr>';
      return;
    }

    // Extraer columnas dinámicamente del primer objeto
    const primeraFila = resultados[0];
    const columnas = Object.keys(primeraFila);

    let html = '<thead><tr>';
    for (const col of columnas) {
      html += `<th>${col}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (const fila of resultados) {
      html += '<tr>';
      for (const col of columnas) {
        let val = fila[col];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        } else if (typeof val === 'number') {
          val = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
        }
        html += `<td>${val !== undefined && val !== null ? val : '-'}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    contenedor.innerHTML = html;
  }

  // --------------------------------------------------------------------------
  // BÚSQUEDA SEMÁNTICA VECTORIAL POR SIMILITUD DEL COSENO
  // --------------------------------------------------------------------------
  const btnCoseno = document.getElementById('coseno-btn-calcular');
  const inputCoseno = document.getElementById('coseno-input-consulta');
  const panelMetricas = document.getElementById('coseno-resultados-metricas');
  const chipsCoseno = document.querySelectorAll('.chip-coseno');

  chipsCoseno.forEach((chip) => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (inputCoseno && q) {
        inputCoseno.value = q;
        ejecutarBusquedaCoseno();
      }
    });
  });

  if (btnCoseno) {
    btnCoseno.addEventListener('click', ejecutarBusquedaCoseno);
  }

  if (inputCoseno) {
    inputCoseno.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') ejecutarBusquedaCoseno();
    });
  }

  async function ejecutarBusquedaCoseno() {
    const consulta = inputCoseno.value.trim();
    if (!consulta) return;

    const proveedor = selectProveedor ? selectProveedor.value : 'gemini';
    btnCoseno.disabled = true;
    btnCoseno.innerText = 'Calculando cos(θ)...';

    try {
      const data = await api.postBusquedaCoseno(consulta, proveedor);

      if (panelMetricas) panelMetricas.style.display = 'block';

      document.getElementById('coseno-cat-resultado').innerText = data.mejor_categoria_identificada;
      document.getElementById('coseno-score-resultado').innerText = `cos(θ) = ${data.similitud_coseno_maxima}`;
      document.getElementById('coseno-afinidad-resultado').innerText = data.porcentaje_afinidad;
      document.getElementById('coseno-motor-resultado').innerText = data.motor_embeddings;
      document.getElementById('coseno-vector-preview').innerText = JSON.stringify(data.muestra_vector);

      const tbody = document.getElementById('coseno-tabla-body');
      if (tbody) {
        if (!data.productos_en_mongodb || data.productos_en_mongodb.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No se encontraron compras para esta categoría.</td></tr>';
        } else {
          tbody.innerHTML = data.productos_en_mongodb
            .map((p) => `
              <tr>
                <td><strong>#${p.producto_id}</strong></td>
                <td><span class="badge badge-db">${(p.marca || 'N/A').toUpperCase()}</span></td>
                <td>$${p.precio_promedio.toFixed(2)}</td>
                <td>${p.total_ventas.toLocaleString()} unidades</td>
                <td style="color: #10b981; font-weight: 700;">$${p.ingresos.toLocaleString()}</td>
              </tr>
            `)
            .join('');
        }
      }
    } catch (err) {
      console.error('[COSENO ERROR]', err);
      alert(`Error calculando similitud del coseno: ${err.message}`);
    } finally {
      btnCoseno.disabled = false;
      btnCoseno.innerText = 'Calcular Coseno Vectorial';
    }
  }
}
