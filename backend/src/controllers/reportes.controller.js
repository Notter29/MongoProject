/**
 * @file reportes.controller.js
 * @description Controlador HTTP para los informes analíticos del dashboard.
 */

const reportesService = require('../services/reportes.service');

class ReportesController {
  async getStats(req, res) {
    try {
      const stats = await reportesService.obtenerEstadisticasSistema();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 1 (Tiempo Real 1): Ventas por periodo
  async getInforme1Ventas(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const data = await reportesService.obtenerInforme1Ventas(fechaInicio, fechaFin);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 2 (Tiempo Real 2): Top productos
  async getInforme2TopProductos(req, res) {
    try {
      const { limite } = req.query;
      const data = await reportesService.obtenerInforme2TopProductos(limite);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 3: Marcas más rentables
  async getInforme3Marcas(req, res) {
    try {
      const { limite } = req.query;
      const data = await reportesService.obtenerInforme3Marcas(limite);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 4: Comparación de categorías
  async getInforme4Categorias(req, res) {
    try {
      const { limite } = req.query;
      const data = await reportesService.obtenerInforme4Categorias(limite);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 5: Clientes VIP
  async getInforme5Clientes(req, res) {
    try {
      const { limite } = req.query;
      const data = await reportesService.obtenerInforme5ClientesVIP(limite);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 6: Embudo de conversión
  async getInforme6Embudo(req, res) {
    try {
      const data = await reportesService.obtenerInforme6EmbudoConversion();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 7: Horarios y días de mayor demanda
  async getInforme7Horarios(req, res) {
    try {
      const data = await reportesService.obtenerInforme7HorariosDemanda();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 8: Detección de caída de demanda
  async getInforme8Disminucion(req, res) {
    try {
      const { fechaCorte, limite } = req.query;
      const data = await reportesService.obtenerInforme8DisminucionDemanda(fechaCorte, limite);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Informe 10 (Tiempo Real 3): Eventos recientes
  async getInforme10EventosRecientes(req, res) {
    try {
      const { limite } = req.query;
      const data = await reportesService.obtenerInforme10EventosRecientes(limite);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ReportesController();
