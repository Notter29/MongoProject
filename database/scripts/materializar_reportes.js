const db = db.getSiblingDB('nyc_taxi_analytics');
const start = ISODate('2019-01-01T00:00:00.000Z');
const end = ISODate('2019-09-01T00:00:00.000Z');

db.yellow_trips.aggregate([
  {
    $match: {
      pickup_datetime: { $gte: start, $lt: end }
    }
  },
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
      ],
      zonas: [
        {
          $group: {
            _id: '$pickup_location_id',
            viajes: { $sum: 1 },
            ingresos: { $sum: '$total_amount' }
          }
        },
        { $sort: { viajes: -1 } },
        { $limit: 100 },
        { $lookup: { from: 'taxi_zones', localField: '_id', foreignField: '_id', as: 'zona' } },
        { $unwind: { path: '$zona', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            location_id: '$_id',
            zona: { $ifNull: ['$zona.zone', 'Zona desconocida'] },
            borough: { $ifNull: ['$zona.borough', 'Desconocido'] },
            viajes: 1,
            ingresos: { $round: ['$ingresos', 2] }
          }
        }
      ],
      rutas: [
        {
          $group: {
            _id: { pickup: '$pickup_location_id', dropoff: '$dropoff_location_id' },
            viajes: { $sum: 1 },
            ingresos: { $sum: '$total_amount' },
            distancia_promedio: { $avg: '$trip_distance' }
          }
        },
        { $sort: { viajes: -1 } },
        { $limit: 100 },
        { $lookup: { from: 'taxi_zones', localField: '_id.pickup', foreignField: '_id', as: 'origen' } },
        { $lookup: { from: 'taxi_zones', localField: '_id.dropoff', foreignField: '_id', as: 'destino' } },
        { $unwind: { path: '$origen', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$destino', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            pickup_location_id: '$_id.pickup',
            dropoff_location_id: '$_id.dropoff',
            origen: { $ifNull: ['$origen.zone', 'Zona desconocida'] },
            destino: { $ifNull: ['$destino.zone', 'Zona desconocida'] },
            borough_origen: { $ifNull: ['$origen.borough', 'Desconocido'] },
            borough_destino: { $ifNull: ['$destino.borough', 'Desconocido'] },
            viajes: 1,
            ingresos: { $round: ['$ingresos', 2] },
            distancia_promedio: { $round: ['$distancia_promedio', 2] }
          }
        }
      ],
      distritos: [
        {
          $group: {
            _id: '$pickup_location_id',
            viajes: { $sum: 1 },
            ingresos: { $sum: '$total_amount' },
            tarifa_promedio: { $avg: '$total_amount' }
          }
        },
        { $lookup: { from: 'taxi_zones', localField: '_id', foreignField: '_id', as: 'zona' } },
        { $unwind: { path: '$zona', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: '$zona.borough',
            viajes: { $sum: '$viajes' },
            ingresos: { $sum: '$ingresos' },
            tarifa_promedio: { $avg: '$tarifa_promedio' }
          }
        },
        { $sort: { ingresos: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            borough: '$_id',
            viajes: 1,
            ingresos: { $round: ['$ingresos', 2] },
            tarifa_promedio: { $round: ['$tarifa_promedio', 2] }
          }
        }
      ],
      pagos: [
        {
          $group: {
            _id: '$payment_type',
            viajes: { $sum: 1 },
            ingresos: { $sum: '$total_amount' },
            tarifa_promedio: { $avg: '$total_amount' }
          }
        },
        { $sort: { viajes: -1 } },
        {
          $project: {
            _id: 0,
            payment_type: '$_id',
            viajes: 1,
            ingresos: { $round: ['$ingresos', 2] },
            tarifa_promedio: { $round: ['$tarifa_promedio', 2] }
          }
        }
      ],
      distancias: [
        { $match: { trip_distance: { $gte: 0 } } },
        {
          $bucket: {
            groupBy: '$trip_distance',
            boundaries: [0, 1, 3, 5, 10, 20, 50, 1000],
            default: '50+',
            output: {
              viajes: { $sum: 1 },
              tarifa_promedio: { $avg: '$total_amount' },
              ingresos: { $sum: '$total_amount' }
            }
          }
        },
        {
          $project: {
            _id: 0,
            distancia_min_millas: '$_id',
            viajes: 1,
            tarifa_promedio: { $round: ['$tarifa_promedio', 2] },
            ingresos: { $round: ['$ingresos', 2] }
          }
        }
      ],
      demanda: [
        {
          $group: {
            _id: {
              dia_semana: { $isoDayOfWeek: '$pickup_datetime' },
              hora: { $hour: '$pickup_datetime' }
            },
            viajes: { $sum: 1 },
            ingresos: { $sum: '$total_amount' }
          }
        },
        { $sort: { '_id.dia_semana': 1, '_id.hora': 1 } },
        {
          $project: {
            _id: 0,
            dia_semana: '$_id.dia_semana',
            hora: '$_id.hora',
            viajes: 1,
            ingresos: { $round: ['$ingresos', 2] }
          }
        }
      ],
      propinas: [
        { $match: { fare_amount: { $gt: 0 }, tip_amount: { $gte: 0 } } },
        {
          $group: {
            _id: '$pickup_location_id',
            viajes: { $sum: 1 },
            propinas: { $sum: '$tip_amount' },
            tarifa: { $sum: '$fare_amount' }
          }
        },
        { $match: { viajes: { $gte: 100 } } },
        {
          $project: {
            viajes: 1,
            propinas: { $round: ['$propinas', 2] },
            porcentaje_propina: {
              $round: [{ $multiply: [{ $divide: ['$propinas', '$tarifa'] }, 100] }, 2]
            }
          }
        },
        { $sort: { porcentaje_propina: -1 } },
        { $limit: 100 },
        { $lookup: { from: 'taxi_zones', localField: '_id', foreignField: '_id', as: 'zona' } },
        { $unwind: { path: '$zona', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            location_id: '$_id',
            zona: { $ifNull: ['$zona.zone', 'Zona desconocida'] },
            borough: { $ifNull: ['$zona.borough', 'Desconocido'] },
            viajes: 1,
            propinas: 1,
            porcentaje_propina: 1
          }
        }
      ]
    }
  },
  {
    $project: {
      _id: { $literal: 'nyc_tlc_yellow_2019_jan_aug' },
      reporte1: {
        kpis: { $arrayElemAt: ['$resumen', 0] },
        serie_diaria: '$serie_diaria'
      },
      reporte2: '$zonas',
      reporte3: '$rutas',
      reporte4: '$distritos',
      reporte5: '$pagos',
      reporte6: '$distancias',
      reporte7: '$demanda',
      reporte8: '$propinas'
    }
  },
  {
    $merge: {
      into: 'analytics_reports',
      on: '_id',
      whenMatched: 'replace',
      whenNotMatched: 'insert'
    }
  }
], { allowDiskUse: true, maxTimeMS: 3600000 }).toArray();

printjson(db.analytics_reports.findOne({ _id: 'nyc_tlc_yellow_2019_jan_aug' }));
