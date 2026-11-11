const geminiProvider = require('./gemini.provider');
const ollamaProvider = require('./ollama.provider');
const { validarPipelineSeguro } = require('./pipeline.validator');
const eventosRepository = require('../../repositories/eventos.repository');

const CONSULTAS_PREDEFINIDAS = [
  { id: 'zonas' },
  { id: 'rutas' },
  { id: 'ingresos_mensuales' },
  { id: 'propinas' },
  { id: 'pagos' }
];

class NlpService {
  async procesarConsultaNatural(pregunta, proveedorSolicitado) {
    if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
      throw new Error('Debe proporcionar una pregunta válida en lenguaje natural.');
    }

    const proveedor = (proveedorSolicitado || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    if (!['gemini', 'ollama'].includes(proveedor)) {
      throw new Error('El proveedor debe ser "gemini" u "ollama".');
    }

    let pipeline;
    let proveedorUsado;
    let errorProveedor;
    try {
      if (proveedor === 'ollama') {
        pipeline = await ollamaProvider.generarPipeline(pregunta);
        proveedorUsado = `Ollama (${ollamaProvider.model})`;
      } else {
        pipeline = await geminiProvider.generarPipeline(pregunta);
        proveedorUsado = `Gemini (${geminiProvider.model})`;
      }
    } catch (error) {
      errorProveedor = error;
      console.warn(`[NLP] No se pudo consultar ${proveedor}: ${error.message}`);
    }

    if (errorProveedor) {
      const consulta = this.buscarConsultaPredefinida(pregunta);
      if (!consulta) {
        throw new Error(
          `No está disponible ${proveedor} y la pregunta no coincide con una consulta guiada. ` +
          'Use preguntas sobre zonas, rutas, ingresos mensuales, propinas o métodos de pago.'
        );
      }

      const resultado = await eventosRepository.ejecutarConsultaGuiada(consulta.id);
      return {
        pregunta_usuario: pregunta.trim(),
        proveedor_utilizado: `Modo guiado local (${proveedor} no disponible)`,
        modo_consulta: 'resumen_materializado',
        pipeline_generado: resultado.pipeline,
        tiempo_ejecucion_ms: resultado.tiempo_ms,
        total_resultados: resultado.total_resultados,
        resultados: resultado.resultados
      };
    }

    const pipelineSeguro = validarPipelineSeguro(pipeline);
    const { tiempo_ms, total_resultados, resultados } =
      await eventosRepository.ejecutarPipelineSeguro(pipelineSeguro);

    return {
      pregunta_usuario: pregunta.trim(),
      proveedor_utilizado: proveedorUsado,
      modo_consulta: 'generacion_ia',
      pipeline_generado: pipelineSeguro,
      tiempo_ejecucion_ms: tiempo_ms,
      total_resultados,
      resultados
    };
  }

  buscarConsultaPredefinida(pregunta) {
    const texto = pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const tiene = (...terminos) => terminos.some((termino) => texto.includes(termino));

    if (tiene('propina')) return CONSULTAS_PREDEFINIDAS.find((item) => item.id === 'propinas');
    if (tiene('ingreso', 'recaudacion') && tiene('mes', 'mensual')) {
      return CONSULTAS_PREDEFINIDAS.find((item) => item.id === 'ingresos_mensuales');
    }
    if (tiene('pago', 'metodo', 'efectivo', 'tarjeta')) {
      return CONSULTAS_PREDEFINIDAS.find((item) => item.id === 'pagos');
    }
    if (tiene('ruta', 'recorrido')) return CONSULTAS_PREDEFINIDAS.find((item) => item.id === 'rutas');
    if (tiene('zona') && tiene('recogida', 'viaje', 'concurrida')) {
      return CONSULTAS_PREDEFINIDAS.find((item) => item.id === 'zonas');
    }
    return null;
  }
}

module.exports = new NlpService();
