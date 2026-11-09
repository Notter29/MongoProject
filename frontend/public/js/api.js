/**
 * @file api.js
 * @description Cliente de comunicación REST con el backend.
 */

const API_BASE = '/api';

const api = {
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    const json = await res.json();
    return json.data;
  },

  async getInforme1Ventas(fechaInicio, fechaFin) {
    let url = `${API_BASE}/informes/1-ventas-periodo`;
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    const json = await res.json();
    return json.data;
  },

  async getInforme2TopProductos(limite = 15) {
    const res = await fetch(`${API_BASE}/informes/2-productos-top?limite=${limite}`);
    const json = await res.json();
    return json.data;
  },

  async getInforme3Marcas(limite = 15) {
    const res = await fetch(`${API_BASE}/informes/3-marcas-rentables?limite=${limite}`);
    const json = await res.json();
    return json.data;
  },

  async getInforme4Categorias(limite = 12) {
    const res = await fetch(`${API_BASE}/informes/4-categorias?limite=${limite}`);
    const json = await res.json();
    return json.data;
  },

  async getInforme5Clientes(limite = 20) {
    const res = await fetch(`${API_BASE}/informes/5-clientes-top?limite=${limite}`);
    const json = await res.json();
    return json.data;
  },

  async getInforme6Embudo() {
    const res = await fetch(`${API_BASE}/informes/6-embudo-conversion`);
    const json = await res.json();
    return json.data;
  },

  async getInforme7Horarios() {
    const res = await fetch(`${API_BASE}/informes/7-horarios-demanda`);
    const json = await res.json();
    return json.data;
  },

  async getInforme8Disminucion(fechaCorte, limite = 15) {
    let url = `${API_BASE}/informes/8-disminucion-demanda?limite=${limite}`;
    if (fechaCorte) url += `&fechaCorte=${encodeURIComponent(fechaCorte)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.data;
  },

  async postInforme9NLP(pregunta, proveedor = 'gemini') {
    const res = await fetch(`${API_BASE}/informes/9-lenguaje-natural`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, proveedor })
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Error al procesar la consulta en lenguaje natural.');
    }
    return json.data;
  },

  async postBusquedaCoseno(consulta, proveedor = 'gemini') {
    const res = await fetch(`${API_BASE}/informes/busqueda-semantica-coseno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consulta, proveedor })
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Error en búsqueda por similitud del coseno.');
    }
    return json.data;
  },

  async getInforme10EventosRecientes(limite = 25) {
    const res = await fetch(`${API_BASE}/informes/10-eventos-recientes?limite=${limite}`);
    const json = await res.json();
    return json.data;
  }
};
