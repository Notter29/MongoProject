const reportesService = require('../services/reportes.service');

class ReportesController {
  async enviar(res, operacion) {
    try {
      res.json({ success: true, data: await operacion() });
    } catch (error) {
      console.error(`[REPORTES ERROR] ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getStats(req, res) {
    return this.enviar(res, () => reportesService.obtenerEstadisticasSistema());
  }

  getInforme1(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme1Viajes(req.query.fechaInicio, req.query.fechaFin));
  }

  getInforme2(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme2Zonas(req.query.limite));
  }

  getInforme3(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme3Rutas(req.query.limite));
  }

  getInforme4(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme4Distritos(req.query.limite));
  }

  getInforme5(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme5Pagos());
  }

  getInforme6(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme6Distancias());
  }

  getInforme7(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme7Horarios());
  }

  getInforme8(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme8Propinas(req.query.limite));
  }

  getInforme10(req, res) {
    return this.enviar(res, () => reportesService.obtenerInforme10ViajesRecientes(req.query.limite));
  }

  getZonas(req, res) {
    const consulta = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!consulta) {
      return res.status(400).json({ success: false, error: 'El parámetro q es obligatorio.' });
    }
    return this.enviar(res, () => reportesService.buscarZonas(consulta));
  }
}

module.exports = new ReportesController();
