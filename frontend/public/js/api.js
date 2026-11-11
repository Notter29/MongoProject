const API_BASE = '/api';

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || `La API respondió ${response.status}.`);
  }
  return result.data;
}

const api = {
  getStats: () => requestJson(`${API_BASE}/stats`),
  getInforme1Viajes: (fechaInicio, fechaFin) => {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('fechaInicio', fechaInicio);
    if (fechaFin) params.set('fechaFin', fechaFin);
    const query = params.toString();
    return requestJson(`${API_BASE}/informes/1-viajes-periodo${query ? `?${query}` : ''}`);
  },
  getInforme2Zonas: (limite = 10) =>
    requestJson(`${API_BASE}/informes/2-zonas-recogida?limite=${limite}`),
  getInforme3Rutas: (limite = 10) =>
    requestJson(`${API_BASE}/informes/3-rutas-populares?limite=${limite}`),
  getInforme4Distritos: (limite = 10) =>
    requestJson(`${API_BASE}/informes/4-ingresos-distrito?limite=${limite}`),
  getInforme5Pagos: () => requestJson(`${API_BASE}/informes/5-formas-pago`),
  getInforme6Distancias: () => requestJson(`${API_BASE}/informes/6-distancias`),
  getInforme7Horarios: () => requestJson(`${API_BASE}/informes/7-demanda-horaria`),
  getInforme8Propinas: (limite = 10) =>
    requestJson(`${API_BASE}/informes/8-propinas?limite=${limite}`),
  getInforme10ViajesRecientes: (limite = 25) =>
    requestJson(`${API_BASE}/informes/10-viajes-recientes?limite=${limite}`),
  postInforme9NLP: (pregunta, proveedor = 'gemini') =>
    requestJson(`${API_BASE}/informes/9-lenguaje-natural`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, proveedor })
    }),
  buscarZonas: (consulta) =>
    requestJson(`${API_BASE}/zonas?q=${encodeURIComponent(consulta)}`)
};
