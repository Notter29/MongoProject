/**
 * @file server.js
 * @description Punto de entrada principal del servidor Backend.
 * Inicializa la conexión a MongoDB, levanta el servidor HTTP Express y activa WebSockets con Socket.io.
 */

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { connectDB, closeDB } = require('./src/config/db');
const { inicializarSockets, detenerChangeStream } = require('./src/sockets/realTime.socket');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    console.log('='.repeat(70));
    console.log('INICIANDO SERVIDOR BACKEND - NYC TAXI ANALYTICS');
    console.log('='.repeat(70));

    // 1. Conexión al motor MongoDB Replica Set
    await connectDB();

    // 2. Creación del servidor HTTP
    const server = http.createServer(app);

    // 3. Inicialización de Socket.io para tiempo real
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // 4. Activar Change Streams y listeners de WebSocket
    inicializarSockets(io);

    // 5. Iniciar escucha en la red (0.0.0.0 para acceso por Tailscale y red local)
    server.listen(PORT, HOST, () => {
      console.log('='.repeat(70));
      console.log(`[OK] Servidor activo escuchando en: http://${HOST}:${PORT}`);
      console.log(`[OK] Conexiones locales:  http://localhost:${PORT}`);
      console.log(`[OK] Conexiones remotas: http://100.x.y.z:${PORT} (vía Tailscale)`);
      console.log('='.repeat(70));
    });

    // Cierre limpio en caso de interrupción
    const gracefulShutdown = async (signal) => {
      console.log(`\n[SHUTDOWN] Señal ${signal} recibida. Cerrando recursos...`);
      detenerChangeStream();
      io.close();
      server.close();
      await closeDB();
      console.log('[SHUTDOWN] Servidor apagado ordenadamente.');
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error(`[FATAL] Error en el arranque del servidor: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
