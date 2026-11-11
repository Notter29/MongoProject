const geminiProvider = require('./gemini.provider');
const ollamaProvider = require('./ollama.provider');
const { validarPipelineSeguro } = require('./pipeline.validator');
const eventosRepository = require('../../repositories/eventos.repository');

const CONSULTAS_PREDEFINIDAS = [
  {
    keywords: ['zonas', 'recogida'],
    pipeline: [
      { $group: { _id: '$pickup_location_id', viajes: { $sum: 1 }, ingresos: { $sum: '$total_amount' } } },
      { $sort: { viajes: -1 } },
      { $limit: 10 }
    ]
  },
  {
    keywords: ['rutas', 'populares'],
    pipeline: [
      {
        $group: {
          _id: { origen: '$pickup_location_id', destino: '$dropoff_location_id' },
          viajes: { $sum: 1 },
          distancia_promedio: { $avg: '$trip_distance' }
        }
      },
      { $sort: { viajes: -1 } },
      { $limit: 10 }
    ]
  },
  {
    keywords: ['ingresos', 'mes'],
    pipeline: [
      {
        $group: {
          _id: { anio: { $year: '$pickup_datetime' }, mes: { $month: '$pickup_datetime' } },
          viajes: { $sum: 1 },
          ingresos: { $sum: '$total_amount' }
        }
      },
      { $sort: { '_id.anio': 1, '_id.mes': 1 } },
      { $limit: 50 }
    ]
  },
  {
    keywords: ['propinas', 'zonas'],
    pipeline: [
      { $match: { fare_amount: { $gt: 0 } } },
      {
        $group: {
          _id: '$pickup_location_id',
          propinas: { $sum: '$tip_amount' },
          tarifa: { $sum: '$fare_amount' },
          viajes: { $sum: 1 }
        }
      },
      { $sort: { propinas: -1 } },
      { $limit: 10 }
    ]
  },
  {
    keywords: ['pagos', 'metodo'],
    pipeline: [
      {
        $group: {
          _id: '$payment_type',
          viajes: { $sum: 1 },
          ingresos: { $sum: '$total_amount' }
        }
      },
      { $sort: { viajes: -1 } },
      { $limit: 10 }
    ]
  }
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
    try {
      if (proveedor === 'ollama') {
        pipeline = await ollamaProvider.generarPipeline(pregunta);
        proveedorUsado = `Ollama (${ollamaProvider.model})`;
      } else {
        pipeline = await geminiProvider.generarPipeline(pregunta);
        proveedorUsado = `Gemini (${geminiProvider.model})`;
      }
    } catch (error) {
      console.warn(`[NLP] No se pudo consultar ${proveedor}: ${error.message}`);
      pipeline = this.buscarConsultaPredefinida(pregunta);
      if (!pipeline) {
        throw new Error(
          `No se pudo interpretar la pregunta con ${proveedor} y no coincide con una consulta guiada. ` +
          'Use preguntas sobre zonas de recogida, rutas, ingresos mensuales, propinas o métodos de pago.'
        );
      }
      proveedorUsado = `${proveedor.toUpperCase()} (consulta guiada local)`;
    }

    const pipelineSeguro = validarPipelineSeguro(pipeline);
    const { tiempo_ms, total_resultados, resultados } =
      await eventosRepository.ejecutarPipelineSeguro(pipelineSeguro);

    return {
      pregunta_usuario: pregunta.trim(),
      proveedor_utilizado: proveedorUsado,
      pipeline_generado: pipelineSeguro,
      tiempo_ejecucion_ms: tiempo_ms,
      total_resultados,
      resultados
    };
  }

  buscarConsultaPredefinida(pregunta) {
    const texto = pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const mejor = CONSULTAS_PREDEFINIDAS
      .map((consulta) => ({
        consulta,
        coincidencias: consulta.keywords.filter((keyword) => texto.includes(keyword)).length
      }))
      .sort((a, b) => b.coincidencias - a.coincidencias)[0];
    return mejor && mejor.coincidencias >= 2
      ? JSON.parse(JSON.stringify(mejor.consulta.pipeline))
      : null;
  }
}

module.exports = new NlpService();
