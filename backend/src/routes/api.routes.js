const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const nlpController = require('../controllers/nlp.controller');

router.get('/stats', (req, res) => reportesController.getStats(req, res));
router.get('/zonas', (req, res) => reportesController.getZonas(req, res));
router.get('/informes/1-viajes-periodo', (req, res) => reportesController.getInforme1(req, res));
router.get('/informes/2-zonas-recogida', (req, res) => reportesController.getInforme2(req, res));
router.get('/informes/3-rutas-populares', (req, res) => reportesController.getInforme3(req, res));
router.get('/informes/4-ingresos-distrito', (req, res) => reportesController.getInforme4(req, res));
router.get('/informes/5-formas-pago', (req, res) => reportesController.getInforme5(req, res));
router.get('/informes/6-distancias', (req, res) => reportesController.getInforme6(req, res));
router.get('/informes/7-demanda-horaria', (req, res) => reportesController.getInforme7(req, res));
router.get('/informes/8-propinas', (req, res) => reportesController.getInforme8(req, res));
router.post('/informes/9-lenguaje-natural', (req, res) => nlpController.procesarConsulta(req, res));
router.get('/informes/10-viajes-recientes', (req, res) => reportesController.getInforme10(req, res));

module.exports = router;
