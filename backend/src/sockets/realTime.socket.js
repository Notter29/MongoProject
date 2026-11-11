const { getEventosCollection } = require('../config/db');

let changeStream = null;

function inicializarSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`);
    socket.emit('database_status', { live: Boolean(changeStream) });
  });

  const collection = getEventosCollection();
  const pipeline = [
    {
      $match: {
        operationType: 'insert',
        'fullDocument.demo': true,
        'fullDocument.source_file': { $exists: false }
      }
    }
  ];

  changeStream = collection.watch(pipeline, { fullDocument: 'default' });
  changeStream.on('change', ({ fullDocument }) => {
    if (!fullDocument) return;

    const viaje = {
      _id: fullDocument._id,
      pickup_datetime: fullDocument.pickup_datetime,
      dropoff_datetime: fullDocument.dropoff_datetime,
      pickup_location_id: fullDocument.pickup_location_id,
      dropoff_location_id: fullDocument.dropoff_location_id,
      passenger_count: fullDocument.passenger_count,
      trip_distance: fullDocument.trip_distance,
      total_amount: fullDocument.total_amount,
      tip_amount: fullDocument.tip_amount,
      payment_type: fullDocument.payment_type
    };

    io.emit('nuevo_viaje', viaje);
    io.emit('incremento_viaje', {
      total_amount: viaje.total_amount || 0,
      trip_distance: viaje.trip_distance || 0,
      pickup_location_id: viaje.pickup_location_id
    });
  });

  changeStream.on('error', (error) => {
    changeStream = null;
    console.error(`[CHANGE STREAM ERROR] ${error.message}`);
    io.emit('database_status', { live: false });
  });

  console.log('[CHANGE STREAM] Escuchando viajes de demostración en vivo.');
}

function detenerChangeStream() {
  if (changeStream) {
    changeStream.close();
    changeStream = null;
  }
}

module.exports = { inicializarSockets, detenerChangeStream };
