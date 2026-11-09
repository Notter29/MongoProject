/**
 * @file eventos.repository.js
 * @description Repositorio de acceso a datos para la colección 'eventos'.
 * 
 * REGLA ESTRICTA DE EVALUACIÓN:
 * Toda operación de búsqueda, filtrado, agregación, agrupamiento y ordenamiento
 * se ejecuta 100% en el motor de base de datos MongoDB mediante Aggregation Pipelines.
 * Cero filtrado con arrays en Node.js.
 */

const { getEventosCollection, getDB } = require('../config/db');

class EventosRepository {
  /**
   * Obtiene las estadísticas de almacenamiento de la base de datos (db.stats).
   * @returns {Promise<Object>}
   */
  async obtenerEstadisticasDB() {
    const db = getDB();
    const stats = await db.command({ dbStats: 1, scale: 1024 * 1024 * 1024 });
    return {
      dbName: stats.db,
      dataSizeGB: Number(stats.dataSize.toFixed(3)),
      storageSizeGB: Number(stats.storageSize.toFixed(3)),
      indexSizeGB: Number(stats.indexSize.toFixed(3)),
      totalDocumentos: stats.objects,
      totalColecciones: stats.collections,
      totalIndices: stats.indexes,
      promedioDocumentoBytes: Math.round(stats.avgObjSize)
    };
  }

  /**
   * INFORME 1 (Tiempo Real 1): Ventas totales e ingresos por fecha o periodo.
   * Ejecuta agregación por día y calcula los KPIs globales del periodo.
   * @param {Date} [fechaInicio]
   * @param {Date} [fechaFin]
   */
  async obtenerVentasPorPeriodo(fechaInicio, fechaFin) {
    const col = getEventosCollection();
    const matchStage = { event_type: 'purchase' };

    if (fechaInicio || fechaFin) {
      matchStage.event_time = {};
      if (fechaInicio) matchStage.event_time.$gte = new Date(fechaInicio);
      if (fechaFin) matchStage.event_time.$lte = new Date(fechaFin);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          serie_diaria: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$event_time' } },
                total_compras: { $sum: 1 },
                ingresos: { $sum: '$price' },
                ticket_promedio: { $avg: '$price' }
              }
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                fecha: '$_id',
                _id: 0,
                total_compras: 1,
                ingresos: { $round: ['$ingresos', 2] },
                ticket_promedio: { $round: ['$ticket_promedio', 2] }
              }
            }
          ],
          resumen_kpi: [
            {
              $group: {
                _id: null,
                ingresos_totales: { $sum: '$price' },
                compras_totales: { $sum: 1 },
                ticket_promedio_general: { $avg: '$price' }
              }
            },
            {
              $project: {
                _id: 0,
                ingresos_totales: { $round: ['$ingresos_totales', 2] },
                compras_totales: 1,
                ticket_promedio_general: { $round: ['$ticket_promedio_general', 2] }
              }
            }
          ]
        }
      }
    ];

    const result = await col.aggregate(pipeline).toArray();
    const data = result[0] || { serie_diaria: [], resumen_kpi: [] };
    const kpis = data.resumen_kpi[0] || { ingresos_totales: 0, compras_totales: 0, ticket_promedio_general: 0 };

    return {
      kpis,
      serie_diaria: data.serie_diaria
    };
  }

  /**
   * INFORME 2 (Tiempo Real 2): Top productos más vendidos y sus ingresos asociados.
   * @param {number} [limite=15]
   */
  async obtenerTopProductos(limite = 15) {
    const col = getEventosCollection();
    const pipeline = [
      { $match: { event_type: 'purchase' } },
      {
        $group: {
          _id: '$product_id',
          unidades_vendidas: { $sum: 1 },
          ingresos_generados: { $sum: '$price' },
          precio_promedio: { $avg: '$price' },
          categoria: { $first: '$category_code' },
          marca: { $first: '$brand' }
        }
      },
      { $sort: { unidades_vendidas: -1 } },
      { $limit: Number(limite) },
      {
        $project: {
          product_id: '$_id',
          _id: 0,
          unidades_vendidas: 1,
          ingresos_generados: { $round: ['$ingresos_generados', 2] },
          precio_promedio: { $round: ['$precio_promedio', 2] },
          categoria: 1,
          marca: 1
        }
      }
    ];

    return await col.aggregate(pipeline).toArray();
  }

  /**
   * INFORME 3: Marcas más rentables y ticket promedio por marca.
   * @param {number} [limite=15]
   */
  async obtenerMarcasRentables(limite = 15) {
    const col = getEventosCollection();
    const pipeline = [
      { $match: { event_type: 'purchase', brand: { $ne: '' } } },
      {
        $group: {
          _id: '$brand',
          ingresos_totales: { $sum: '$price' },
          total_ventas: { $sum: 1 },
          ticket_promedio: { $avg: '$price' }
        }
      },
      { $sort: { ingresos_totales: -1 } },
      { $limit: Number(limite) },
      {
        $project: {
          marca: '$_id',
          _id: 0,
          ingresos_totales: { $round: ['$ingresos_totales', 2] },
          total_ventas: 1,
          ticket_promedio: { $round: ['$ticket_promedio', 2] }
        }
      }
    ];

    return await col.aggregate(pipeline).toArray();
  }

  /**
   * INFORME 4: Comparación de categorías (ingresos, unidades, precio promedio).
   * @param {number} [limite=12]
   */
  async obtenerComparacionCategorias(limite = 12) {
    const col = getEventosCollection();
    const pipeline = [
      { $match: { event_type: 'purchase', category_code: { $ne: '' } } },
      {
        $group: {
          _id: '$category_code',
          total_unidades: { $sum: 1 },
          ingresos_totales: { $sum: '$price' },
          precio_promedio: { $avg: '$price' }
        }
      },
      { $sort: { ingresos_totales: -1 } },
      { $limit: Number(limite) },
      {
        $project: {
          categoria: '$_id',
          _id: 0,
          total_unidades: 1,
          ingresos_totales: { $round: ['$ingresos_totales', 2] },
          precio_promedio: { $round: ['$precio_promedio', 2] }
        }
      }
    ];

    return await col.aggregate(pipeline).toArray();
  }

  /**
   * INFORME 5: Clientes VIP (Top compradores por gasto acumulado y frecuencia).
   * @param {number} [limite=20]
   */
  async obtenerClientesTop(limite = 20) {
    const col = getEventosCollection();
    const pipeline = [
      { $match: { event_type: 'purchase' } },
      {
        $group: {
          _id: '$user_id',
          gasto_total: { $sum: '$price' },
          total_compras: { $sum: 1 },
          ticket_promedio: { $avg: '$price' },
          primera_compra: { $min: '$event_time' },
          ultima_compra: { $max: '$event_time' }
        }
      },
      { $sort: { gasto_total: -1 } },
      { $limit: Number(limite) },
      {
        $project: {
          user_id: '$_id',
          _id: 0,
          gasto_total: { $round: ['$gasto_total', 2] },
          total_compras: 1,
          ticket_promedio: { $round: ['$ticket_promedio', 2] },
          primera_compra: 1,
          ultima_compra: 1
        }
      }
    ];

    return await col.aggregate(pipeline).toArray();
  }

  /**
   * INFORME 6: Embudo de conversión y tasa de abandono de carrito (views vs cart vs purchase).
   */
  async obtenerEmbudoConversion() {
    const col = getEventosCollection();
    const pipeline = [
      {
        $group: {
          _id: '$event_type',
          total_eventos: { $sum: 1 }
        }
      }
    ];

    const resultados = await col.aggregate(pipeline).toArray();
    const mapa = {};
    for (const r of resultados) {
      mapa[r._id] = r.total_eventos;
    }

    const views = mapa['view'] || 0;
    const cart = mapa['cart'] || 0;
    const purchase = mapa['purchase'] || 0;
    const removeFromCart = mapa['remove_from_cart'] || 0;

    const tasaConversionTotal = views > 0 ? Number(((purchase / views) * 100).toFixed(2)) : 0;
    const tasaConversionCarrito = cart > 0 ? Number(((purchase / cart) * 100).toFixed(2)) : 0;
    const tasaAbandonoCarrito = cart > 0 ? Number((((cart - purchase) / cart) * 100).toFixed(2)) : 0;

    return {
      etapas: [
        { etapa: 'Vistas de Producto (view)', cantidad: views, porcentaje_relativo: 100 },
        { etapa: 'Añadidos al Carrito (cart)', cantidad: cart, porcentaje_relativo: views > 0 ? Number(((cart / views) * 100).toFixed(2)) : 0 },
        { etapa: 'Compras Efectivas (purchase)', cantidad: purchase, porcentaje_relativo: views > 0 ? Number(((purchase / views) * 100).toFixed(2)) : 0 },
        { etapa: 'Eliminados de Carrito (remove)', cantidad: removeFromCart, porcentaje_relativo: cart > 0 ? Number(((removeFromCart / cart) * 100).toFixed(2)) : 0 }
      ],
      metricas: {
        tasa_conversion_global_pct: tasaConversionTotal,
        tasa_conversion_carrito_pct: tasaConversionCarrito,
        tasa_abandono_carrito_pct: tasaAbandonoCarrito
      }
    };
  }

  /**
   * INFORME 7: Comportamiento por franjas horarias y días de la semana (Mapa de Calor).
   */
  async obtenerHorariosDemanda() {
    const col = getEventosCollection();
    const pipeline = [
      { $match: { event_type: 'purchase' } },
      {
        $group: {
          _id: {
            dia_semana: { $isoDayOfWeek: '$event_time' }, // 1 (Lunes) a 7 (Domingo)
            hora: { $hour: '$event_time' }                // 0 a 23
          },
          transacciones: { $sum: 1 },
          ingresos: { $sum: '$price' }
        }
      },
      {
        $sort: {
          '_id.dia_semana': 1,
          '_id.hora': 1
        }
      },
      {
        $project: {
          _id: 0,
          dia_semana: '$_id.dia_semana',
          hora: '$_id.hora',
          transacciones: 1,
          ingresos: { $round: ['$ingresos', 2] }
        }
      }
    ];

    return await col.aggregate(pipeline).toArray();
  }

  /**
   * INFORME 8: Detección de productos con disminución de demanda entre periodos.
   * Compara ventas en dos ventanas de tiempo consecutivas para identificar caídas drásticas.
   * @param {Date} [fechaCorte]
   * @param {number} [limite=15]
   */
  async obtenerProductosDisminucionDemanda(fechaCorte = new Date('2019-10-16T00:00:00.000Z'), limite = 15) {
    const col = getEventosCollection();
    const corte = new Date(fechaCorte);

    const pipeline = [
      { $match: { event_type: 'purchase' } },
      {
        $group: {
          _id: '$product_id',
          categoria: { $first: '$category_code' },
          marca: { $first: '$brand' },
          precio_promedio: { $avg: '$price' },
          ventas_periodo_1: {
            $sum: { $cond: [{ $lt: ['$event_time', corte] }, 1, 0] }
          },
          ventas_periodo_2: {
            $sum: { $cond: [{ $gte: ['$event_time', corte] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          product_id: '$_id',
          _id: 0,
          categoria: 1,
          marca: 1,
          precio_promedio: { $round: ['$precio_promedio', 2] },
          ventas_periodo_1: 1,
          ventas_periodo_2: 1,
          caida_unidades: { $subtract: ['$ventas_periodo_1', '$ventas_periodo_2'] },
          porcentaje_caida: {
            $cond: [
              { $gt: ['$ventas_periodo_1', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ['$ventas_periodo_1', '$ventas_periodo_2'] },
                          '$ventas_periodo_1'
                        ]
                      },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          }
        }
      },
      // Solo productos con caídas reales y volumen representativo en periodo 1
      {
        $match: {
          ventas_periodo_1: { $gte: 15 },
          caida_unidades: { $gt: 5 }
        }
      },
      { $sort: { caida_unidades: -1 } },
      { $limit: Number(limite) }
    ];

    return await col.aggregate(pipeline).toArray();
  }

  /**
   * INFORME 9: Ejecución de consultas analíticas en Lenguaje Natural traducidas a Pipeline.
   * @param {Array<Object>} pipeline Pipeline validado de etapas de lectura.
   * @returns {Promise<{ tiempo_ms: number, resultados: Array<Object> }>}
   */
  async ejecutarPipelineSeguro(pipeline) {
    const col = getEventosCollection();
    const tInicio = Date.now();
    const resultados = await col.aggregate(pipeline, { maxTimeMS: 180000, allowDiskUse: true }).toArray();
    const tiempo_ms = Date.now() - tInicio;

    return {
      tiempo_ms,
      total_resultados: resultados.length,
      resultados
    };
  }

  /**
   * INFORME 10 (Tiempo Real 3): Monitor de últimas transacciones en vivo.
   * @param {number} [limite=25]
   */
  async obtenerEventosRecientes(limite = 25) {
    const col = getEventosCollection();
    const docs = await col
      .find({ event_type: 'purchase' })
      .sort({ event_time: -1 })
      .limit(Number(limite))
      .project({
        _id: 1,
        event_time: 1,
        product_id: 1,
        category_code: 1,
        brand: 1,
        price: 1,
        user_id: 1,
        user_session: 1
      })
      .toArray();

    return docs;
  }
}

module.exports = new EventosRepository();
