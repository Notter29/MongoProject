/**
 * MongoDB aggregations for the NYC TLC yellow-taxi trip dataset.
 */

const { getEventosCollection, getDB } = require('../config/db');

const ZONE_COLLECTION = 'taxi_zones';
const REPORTS_COLLECTION = 'analytics_reports';
const REPORTS_ID = 'nyc_tlc_yellow_2019_jan_aug';
const DATASET_START = Date.UTC(2019, 0, 1);
const DATASET_END = Date.UTC(2019, 8, 1);

async function obtenerReporteMaterializado(nombre) {
  const resumen = await getDB().collection(REPORTS_COLLECTION).findOne({ _id: REPORTS_ID });
  if (!resumen || !Object.hasOwn(resumen, nombre)) {
    throw new Error('Falta el resumen analítico. Ejecute database/scripts/materializar_reportes.js.');
  }
  return resumen[nombre];
}

function periodoDataset() {
  return {
    pickup_datetime: {
      $gte: new Date(DATASET_START),
      $lt: new Date(DATASET_END)
    }
  };
}

class EventosRepository {
  async obtenerEstadisticasDB() {
    const stats = await getDB().command({ dbStats: 1, scale: 1024 ** 3 });
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

  async obtenerViajesPorPeriodo(fechaInicio, fechaFin) {
    if (!fechaInicio && !fechaFin) {
      return obtenerReporteMaterializado('reporte1');
    }

    const filtrosFecha = [periodoDataset()];
    if (fechaInicio) filtrosFecha.push({ pickup_datetime: { $gte: new Date(fechaInicio) } });
    if (fechaFin) filtrosFecha.push({ pickup_datetime: { $lte: new Date(fechaFin) } });
    const match = filtrosFecha.length === 1 ? filtrosFecha[0] : { $and: filtrosFecha };

    const [result = { serie_diaria: [], resumen: [] }] = await getEventosCollection()
      .aggregate([
        { $match: match },
        {
          $facet: {
            serie_diaria: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$pickup_datetime' } },
                  viajes: { $sum: 1 },
                  ingresos: { $sum: '$total_amount' },
                  distancia_promedio: { $avg: '$trip_distance' }
                }
              },
              { $sort: { _id: 1 } },
              {
                $project: {
                  _id: 0,
                  fecha: '$_id',
                  viajes: 1,
                  ingresos: { $round: ['$ingresos', 2] },
                  distancia_promedio: { $round: ['$distancia_promedio', 2] }
                }
              }
            ],
            resumen: [
              {
                $group: {
                  _id: null,
                  total_viajes: { $sum: 1 },
                  ingresos_totales: { $sum: '$total_amount' },
                  tarifa_promedio: { $avg: '$total_amount' },
                  distancia_promedio: { $avg: '$trip_distance' }
                }
              },
              {
                $project: {
                  _id: 0,
                  total_viajes: 1,
                  ingresos_totales: { $round: ['$ingresos_totales', 2] },
                  tarifa_promedio: { $round: ['$tarifa_promedio', 2] },
                  distancia_promedio: { $round: ['$distancia_promedio', 2] }
                }
              }
            ]
          }
        }
      ], { allowDiskUse: true, maxTimeMS: 180000 })
      .toArray();

    return {
      kpis: result.resumen[0] || {
        total_viajes: 0,
        ingresos_totales: 0,
        tarifa_promedio: 0,
        distancia_promedio: 0
      },
      serie_diaria: result.serie_diaria
    };
  }

  async obtenerZonasRecogida(limite = 10) {
    return (await obtenerReporteMaterializado('reporte2')).slice(0, Number(limite));
  }

  async obtenerRutasPopulares(limite = 10) {
    return (await obtenerReporteMaterializado('reporte3')).slice(0, Number(limite));
  }

  async obtenerIngresosPorDistrito(limite = 10) {
    return (await obtenerReporteMaterializado('reporte4')).slice(0, Number(limite));
  }

  async obtenerFormasPago() {
    return obtenerReporteMaterializado('reporte5');
  }

  async obtenerDistribucionDistancias() {
    return obtenerReporteMaterializado('reporte6');
  }

  async obtenerDemandaHoraria() {
    return obtenerReporteMaterializado('reporte7');
  }

  async obtenerPropinasPorZona(limite = 10) {
    return (await obtenerReporteMaterializado('reporte8')).slice(0, Number(limite));
  }

  async ejecutarPipelineSeguro(pipeline) {
    const started = Date.now();
    const resultados = await getEventosCollection()
      .aggregate([{ $match: periodoDataset() }, ...pipeline], { maxTimeMS: 180000, allowDiskUse: true })
      .toArray();
    return { tiempo_ms: Date.now() - started, total_resultados: resultados.length, resultados };
  }

  async obtenerViajesRecientes(limite = 25) {
    return getEventosCollection().aggregate([
      { $match: periodoDataset() },
      { $match: { pickup_datetime: { $type: 'date' } } },
      { $sort: { pickup_datetime: -1 } },
      { $limit: Number(limite) },
      { $lookup: { from: ZONE_COLLECTION, localField: 'pickup_location_id', foreignField: '_id', as: 'origen' } },
      { $lookup: { from: ZONE_COLLECTION, localField: 'dropoff_location_id', foreignField: '_id', as: 'destino' } },
      { $unwind: { path: '$origen', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$destino', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          pickup_datetime: 1,
          dropoff_datetime: 1,
          pickup_location_id: 1,
          dropoff_location_id: 1,
          origen: { $ifNull: ['$origen.zone', 'Zona desconocida'] },
          destino: { $ifNull: ['$destino.zone', 'Zona desconocida'] },
          passenger_count: 1,
          trip_distance: 1,
          total_amount: 1,
          tip_amount: 1,
          payment_type: 1
        }
      }
    ]).toArray();
  }

  async buscarZonas(consulta, limite = 20) {
    const escaped = consulta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return getDB().collection(ZONE_COLLECTION).find({
      $or: [
        { zone: { $regex: escaped, $options: 'i' } },
        { borough: { $regex: escaped, $options: 'i' } },
        { service_zone: { $regex: escaped, $options: 'i' } }
      ]
    }).sort({ borough: 1, zone: 1 }).limit(Number(limite)).toArray();
  }
}

module.exports = new EventosRepository();
