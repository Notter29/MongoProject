function inicializarWebSocket(callbacks) {
  const socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10
  });
  const statusText = document.getElementById('socket-status-text');

  socket.on('connect', () => {
    if (statusText) statusText.innerText = 'Verificando Change Streams...';
  });
  socket.on('connect_error', () => {
    if (statusText) statusText.innerText = 'API desconectada';
  });
  socket.on('database_status', (status) => {
    callbacks?.onEstadoBD?.(status.live);
  });
  socket.on('nuevo_viaje', (viaje) => callbacks?.onNuevoViaje?.(viaje));
  socket.on('incremento_viaje', (datos) => callbacks?.onIncrementoViaje?.(datos));
  socket.on('disconnect', () => callbacks?.onEstadoBD?.(false));
}
