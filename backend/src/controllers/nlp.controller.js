/**
 * @file nlp.controller.js
 * @description Controlador HTTP para el Informe 9: Consultas en Lenguaje Natural (Text-to-Aggregation)
 * y Búsqueda Semántica Vectorial por Similitud del Coseno.
 */

const nlpService = require('../services/nlp/nlp.service');
const embeddingService = require('../services/nlp/embedding.service');

class NlpController {
  async procesarConsulta(req, res) {
    try {
      const { pregunta, proveedor } = req.body;

      if (!pregunta || typeof pregunta !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'El campo "pregunta" es obligatorio y debe ser una cadena de texto.'
        });
      }

      const resultado = await nlpService.procesarConsultaNatural(pregunta, proveedor);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error(`[NLP CONTROLLER ERROR] ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Búsqueda Semántica Vectorial por Similitud del Coseno
  async busquedaSemanticaCoseno(req, res) {
    try {
      const { consulta, proveedor } = req.body;

      if (!consulta || typeof consulta !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'El campo "consulta" es obligatorio.'
        });
      }

      const resultado = await embeddingService.buscarPorSimilitudCoseno(consulta, proveedor);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error(`[EMBEDDING CONTROLLER ERROR] ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new NlpController();
