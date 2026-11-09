/**
 * @file api.routes.js
 * @description Definición de endpoints REST para los 10 informes y el sistema.
 */

const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const nlpController = require('../controllers/nlp.controller');

// Estadísticas de la base de datos (db.stats)
router.get('/stats', (req, res) => reportesController.getStats(req, res));

// Informe 1 (Tiempo Real 1): Ventas totales e ingresos por periodo
router.get('/informes/1-ventas-periodo', (req, res) => reportesController.getInforme1Ventas(req, res));

// Informe 2 (Tiempo Real 2): Top productos más vendidos
router.get('/informes/2-productos-top', (req, res) => reportesController.getInforme2TopProductos(req, res));

// Informe 3: Marcas más rentables y ticket promedio
router.get('/informes/3-marcas-rentables', (req, res) => reportesController.getInforme3Marcas(req, res));

// Informe 4: Comparación de categorías
router.get('/informes/4-categorias', (req, res) => reportesController.getInforme4Categorias(req, res));

// Informe 5: Clientes VIP (Top compradores)
router.get('/informes/5-clientes-top', (req, res) => reportesController.getInforme5Clientes(req, res));

// Informe 6: Embudo de conversión y tasa de abandono
router.get('/informes/6-embudo-conversion', (req, res) => reportesController.getInforme6Embudo(req, res));

// Informe 7: Comportamiento por franjas horarias y días
router.get('/informes/7-horarios-demanda', (req, res) => reportesController.getInforme7Horarios(req, res));

// Informe 8: Detección de caída de demanda
router.get('/informes/8-disminucion-demanda', (req, res) => reportesController.getInforme8Disminucion(req, res));

// Informe 9: Consultas analíticas en Lenguaje Natural (Gemini / Ollama)
router.post('/informes/9-lenguaje-natural', (req, res) => nlpController.procesarConsulta(req, res));

// Búsqueda Semántica Vectorial por Similitud del Coseno (Embeddings Gemini / Ollama)
router.post('/informes/busqueda-semantica-coseno', (req, res) => nlpController.busquedaSemanticaCoseno(req, res));

// Informe 10 (Tiempo Real 3): Monitor de transacciones recientes
router.get('/informes/10-eventos-recientes', (req, res) => reportesController.getInforme10EventosRecientes(req, res));

module.exports = router;
