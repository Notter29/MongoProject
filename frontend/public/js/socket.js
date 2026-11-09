/**
 * @file socket.js
 * @description Gestor de eventos en tiempo real con Socket.io.
 * Recibe eventos emitidos desde MongoDB Change Streams.
 */

let socket = null;

function inicializarWebSocket(callbacks) {
  // Conectar al mismo host y puerto
  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10
  });

  const statusDot = document.getElementById('socket-status-dot');
  const statusText = document.getElementById('socket-status-text');

  socket.on('connect', () => {
    console.log('[SOCKET] Conectado en tiempo real con ID:', socket.id);
    if (statusDot) statusDot.classList.add('online');
    if (statusText) statusText.innerText = 'En vivo (Change Streams)';
  });

  socket.on('disconnect', () => {
    console.warn('[SOCKET] Desconectado del servidor.');
    if (statusDot) statusDot.classList.remove('online');
    if (statusText) statusText.innerText = 'Desconectado';
  });

  // Evento para Informe 10: Nueva transacción insertada en tiempo real
  socket.on('nueva_transaccion', (transaccion) => {
    if (callbacks && typeof callbacks.onNuevaTransaccion === 'function') {
      callbacks.onNuevaTransaccion(transaccion);
    }
  });

  // Evento para Informes 1 y 2: Incremento acumulativo
  socket.on('incremento_venta', (datos) => {
    if (callbacks && typeof callbacks.onIncrementoVenta === 'function') {
      callbacks.onIncrementoVenta(datos);
    }
  });
}
