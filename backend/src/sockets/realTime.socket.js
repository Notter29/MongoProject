/**
 * @file realTime.socket.js
 * @description Módulo WebSocket con Socket.io y MongoDB Change Streams.
 * 
 * REGLA ESTRICTA DE EVALUACIÓN (Ítem 4.6 del PDF):
 * "Al menos tres (3) de los diez informes deberá implementar actualización de información
 *  en tiempo real... mediante Change Streams sobre replica sets o sharded clusters."
 */

const { getEventosCollection } = require('../config/db');

let changeStream = null;

/**
 * Inicializa Socket.io y el Change Stream sobre la colección 'eventos'.
 * @param {import('socket.io').Server} io
 */
function inicializarSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id} (Total conectados: ${io.engine.clientsCount})`);

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Cliente desconectado: ${socket.id}`);
    });
  });

  try {
    const col = getEventosCollection();
    console.log('[CHANGE STREAM] Iniciando escucha de inserciones en la colección eventos...');

    // Observar solo operaciones de inserción
    const pipeline = [
      {
        $match: {
          operationType: 'insert'
        }
      }
    ];

    changeStream = col.watch(pipeline, { fullDocument: 'updateLookup' });

    changeStream.on('change', (change) => {
      const doc = change.fullDocument;
      if (!doc) return;

      // Solo emitimos si es un evento de compra relevante
      if (doc.event_type === 'purchase') {
        const transaccion = {
          _id: doc._id,
          event_time: doc.event_time,
          product_id: doc.product_id,
          category_code: doc.category_code,
          brand: doc.brand,
          price: doc.price,
          user_id: doc.user_id,
          user_session: doc.user_session
        };

        // 1. Emisión para Informe 10 (Monitor de transacciones recientes)
        io.emit('nueva_transaccion', transaccion);

        // 2. Emisión para Informes 1 y 2 (Actualización de KPIs e incremento)
        io.emit('incremento_venta', {
          monto: doc.price,
          product_id: doc.product_id,
          brand: doc.brand,
          categoria: doc.category_code,
          timestamp: doc.event_time
        });
      }
    });

    changeStream.on('error', (error) => {
      console.error(`[CHANGE STREAM ERROR] Error en el flujo de cambios: ${error.message}`);
    });

    console.log('[CHANGE STREAM] Conectado exitosamente al Oplog de MongoDB.');
  } catch (error) {
    console.error(`[CHANGE STREAM ERROR] No se pudo inicializar Change Streams: ${error.message}`);
  }
}

function detenerChangeStream() {
  if (changeStream) {
    changeStream.close();
    changeStream = null;
    console.log('[CHANGE STREAM] Flujo de cambios detenido.');
  }
}

module.exports = {
  inicializarSockets,
  detenerChangeStream
};
