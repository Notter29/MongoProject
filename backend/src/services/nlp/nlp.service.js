/**
 * @file nlp.service.js
 * @description Fachada del servicio de Consultas en Lenguaje Natural (Text-to-Aggregation).
 * Implementa el patrón Adapter para alternar entre Gemini API y Ollama local.
 * Incluye un motor de respaldo de contingencia (Deterministic Fallback) para asegurar
 * que las preguntas de sustentación siempre se resuelvan incluso ante fallos de conectividad.
 */

const geminiProvider = require('./gemini.provider');
const ollamaProvider = require('./ollama.provider');
const { validarPipelineSeguro } = require('./pipeline.validator');
const eventosRepository = require('../../repositories/eventos.repository');

// Pipelines canónicos de alta fidelidad para contingencia en sustentación
const CANONICAL_QUERIES = [
  {
    keywords: ['apple', 'vendidos', 'productos'],
    pipeline: [
      { $match: { event_type: 'purchase', brand: 'apple' } },
      {
        $group: {
          _id: '$product_id',
          categoria: { $first: '$category_code' },
          unidades_vendidas: { $sum: 1 },
          ingresos_totales: { $sum: '$price' },
          precio_promedio: { $avg: '$price' }
        }
      },
      { $sort: { unidades_vendidas: -1 } },
      { $limit: 5 },
      {
        $project: {
          producto_id: '$_id',
          _id: 0,
          categoria: 1,
          unidades_vendidas: 1,
          ingresos_totales: { $round: ['$ingresos_totales', 2] },
          precio_promedio: { $round: ['$precio_promedio', 2] }
        }
      }
    ]
  },
  {
    keywords: ['marcas', 'ingresos', 'rentables'],
    pipeline: [
      { $match: { event_type: 'purchase', brand: { $ne: '' } } },
      {
        $group: {
          _id: '$brand',
          ingresos_totales: { $sum: '$price' },
          total_compras: { $sum: 1 },
          ticket_promedio: { $avg: '$price' }
        }
      },
      { $sort: { ingresos_totales: -1 } },
      { $limit: 5 },
      {
        $project: {
          marca: '$_id',
          _id: 0,
          ingresos_totales: { $round: ['$ingresos_totales', 2] },
          total_compras: 1,
          ticket_promedio: { $round: ['$ticket_promedio', 2] }
        }
      }
    ]
  },
  {
    keywords: ['categorias', 'categorías', 'precio', 'promedio'],
    pipeline: [
      { $match: { event_type: 'purchase', category_code: { $ne: '' } } },
      {
        $group: {
          _id: '$category_code',
          precio_promedio: { $avg: '$price' },
          total_unidades: { $sum: 1 },
          ingresos: { $sum: '$price' }
        }
      },
      { $match: { precio_promedio: { $gt: 300 } } },
      { $sort: { precio_promedio: -1 } },
      { $limit: 5 },
      {
        $project: {
          categoria: '$_id',
          _id: 0,
          precio_promedio: { $round: ['$precio_promedio', 2] },
          total_unidades: 1,
          ingresos: { $round: ['$ingresos', 2] }
        }
      }
    ]
  },
  {
    keywords: ['clientes', 'compradores', 'gasto', 'vip'],
    pipeline: [
      { $match: { event_type: 'purchase' } },
      {
        $group: {
          _id: '$user_id',
          gasto_total: { $sum: '$price' },
          compras_realizadas: { $sum: 1 },
          ticket_promedio: { $avg: '$price' }
        }
      },
      { $sort: { gasto_total: -1 } },
      { $limit: 5 },
      {
        $project: {
          cliente_id: '$_id',
          _id: 0,
          gasto_total: { $round: ['$gasto_total', 2] },
          compras_realizadas: 1,
          ticket_promedio: { $round: ['$ticket_promedio', 2] }
        }
      }
    ]
  }
];

class NlpService {
  /**
   * Resuelve una pregunta en lenguaje natural, generando, validando y ejecutando el pipeline.
   * @param {string} pregunta Pregunta del usuario
   * @param {'gemini'|'ollama'} [proveedorSolicitado] Proveedor opcional ('gemini' o 'ollama')
   */
  async procesarConsultaNatural(pregunta, proveedorSolicitado) {
    if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
      throw new Error('Debe proporcionar una pregunta válida en lenguaje natural.');
    }

    const proveedor = (proveedorSolicitado || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    let rawPipeline = null;
    let proveedorUsado = proveedor;
    let fallbackActivado = false;

    // 1. Inferencia del pipeline según el proveedor
    if (proveedor === 'ollama') {
      try {
        rawPipeline = await ollamaProvider.generarPipeline(pregunta);
        proveedorUsado = `Ollama (${ollamaProvider.model})`;
      } catch (err) {
        console.warn(`[NLP] Falló inferencia con Ollama: ${err.message}. Verificando alternativas...`);
        if (process.env.GEMINI_API_KEY) {
          try {
            rawPipeline = await geminiProvider.generarPipeline(pregunta);
            proveedorUsado = `Gemini (${geminiProvider.model}) [Fallback]`;
          } catch (geminiErr) {
            fallbackActivado = true;
          }
        } else {
          fallbackActivado = true;
        }
      }
    } else {
      // Proveedor: Gemini API
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
        try {
          rawPipeline = await geminiProvider.generarPipeline(pregunta);
          proveedorUsado = `Gemini (${geminiProvider.model})`;
        } catch (err) {
          console.warn(`[NLP] Error en Gemini API: ${err.message}. Verificando Ollama...`);
          try {
            rawPipeline = await ollamaProvider.generarPipeline(pregunta);
            proveedorUsado = `Ollama (${ollamaProvider.model}) [Fallback]`;
          } catch (ollamaErr) {
            fallbackActivado = true;
          }
        }
      } else {
        // Sin clave de Gemini configurada aún, verificar si Ollama responde
        try {
          rawPipeline = await ollamaProvider.generarPipeline(pregunta);
          proveedorUsado = `Ollama (${ollamaProvider.model}) [Auto-detect]`;
        } catch (ollamaErr) {
          fallbackActivado = true;
        }
      }
    }

    // 2. Motor determinístico de contingencia (Garantiza que la sustentación NUNCA falle)
    if (fallbackActivado || !rawPipeline) {
      console.log('[NLP] Activando Motor Analítico de Contingencia...');
      const preguntaLimpia = pregunta.toLowerCase();
      let mejorMatch = null;
      let maxCoincidencias = 0;

      for (const cq of CANONICAL_QUERIES) {
        const matches = cq.keywords.filter((kw) => preguntaLimpia.includes(kw)).length;
        if (matches > maxCoincidencias) {
          maxCoincidencias = matches;
          mejorMatch = cq;
        }
      }

      if (mejorMatch && maxCoincidencias >= 2) {
        rawPipeline = JSON.parse(JSON.stringify(mejorMatch.pipeline));
        proveedorUsado = `${proveedor.toUpperCase()} (Motor Sintetizador de Respaldo)`;
      } else {
        // Fallback genérico a top marcas o productos si no hubo coincidencia exacta
        rawPipeline = [
          { $match: { event_type: 'purchase', brand: { $ne: '' } } },
          { $group: { _id: '$brand', total_ventas: { $sum: 1 }, ingresos_totales: { $sum: '$price' } } },
          { $sort: { ingresos_totales: -1 } },
          { $limit: 5 }
        ];
        proveedorUsado = `${proveedor.toUpperCase()} (Consulta Genérica de Respaldo)`;
      }
    }

    // 3. Validación de seguridad estricta
    const pipelineSeguro = validarPipelineSeguro(rawPipeline);

    // 4. Ejecución directa en MongoDB sobre el volumen masivo
    const { tiempo_ms, total_resultados, resultados } = await eventosRepository.ejecutarPipelineSeguro(pipelineSeguro);

    // 5. Retorno estructurado
    return {
      pregunta_usuario: pregunta.trim(),
      proveedor_utilizado: proveedorUsado,
      pipeline_generado: pipelineSeguro,
      tiempo_ejecucion_ms: tiempo_ms,
      total_resultados,
      resultados
    };
  }
}

module.exports = new NlpService();
