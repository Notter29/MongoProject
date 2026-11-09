/**
 * @file reportes.service.js
 * @description Capa de servicio para los 10 informes analíticos del dashboard.
 * Valida parámetros, aplica reglas de negocio y delega a la capa repository.
 */

const eventosRepository = require('../repositories/eventos.repository');

class ReportesService {
  async obtenerEstadisticasSistema() {
    return await eventosRepository.obtenerEstadisticasDB();
  }

  async obtenerInforme1Ventas(fechaInicio, fechaFin) {
    return await eventosRepository.obtenerVentasPorPeriodo(fechaInicio, fechaFin);
  }

  async obtenerInforme2TopProductos(limite) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 15, 1), 100);
    return await eventosRepository.obtenerTopProductos(lim);
  }

  async obtenerInforme3Marcas(limite) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 15, 1), 100);
    return await eventosRepository.obtenerMarcasRentables(lim);
  }

  async obtenerInforme4Categorias(limite) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 12, 1), 50);
    return await eventosRepository.obtenerComparacionCategorias(lim);
  }

  async obtenerInforme5ClientesVIP(limite) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 20, 1), 100);
    return await eventosRepository.obtenerClientesTop(lim);
  }

  async obtenerInforme6EmbudoConversion() {
    return await eventosRepository.obtenerEmbudoConversion();
  }

  async obtenerInforme7HorariosDemanda() {
    return await eventosRepository.obtenerHorariosDemanda();
  }

  async obtenerInforme8DisminucionDemanda(fechaCorte, limite) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 15, 1), 50);
    const corte = fechaCorte ? new Date(fechaCorte) : new Date('2019-10-16T00:00:00.000Z');
    return await eventosRepository.obtenerProductosDisminucionDemanda(corte, lim);
  }

  async obtenerInforme10EventosRecientes(limite) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 25, 5), 100);
    return await eventosRepository.obtenerEventosRecientes(lim);
  }
}

module.exports = new ReportesService();
