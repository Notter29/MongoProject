/**
 * @file app.js
 * @description Configuración principal de la aplicación Express y sus middlewares.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api.routes');

const app = express();

// Middlewares globales
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger ligero para depuración de peticiones
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const duracion = Date.now() - t0;
    if (req.url.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracion} ms)`);
    }
  });
  next();
});

// Rutas de la API REST
app.use('/api', apiRoutes);

// Servir frontend (public o dist)
const publicPath = path.join(__dirname, '../../frontend/public');
const distPath = path.join(__dirname, '../../frontend/dist');
const staticPath = fs.existsSync(publicPath) ? publicPath : distPath;

app.use(express.static(staticPath));

app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send(`
    <html>
      <head><title>API Backend Activa</title></head>
      <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
        <h2>🚀 Backend API de eCommerce Analytics Activo</h2>
        <p>MongoDB Replica Set y WebSocket Socket.io operativos en <code>http://0.0.0.0:3000</code>.</p>
        <p>Consulta los endpoints en <a style="color: #38bdf8;" href="/api/stats">/api/stats</a></p>
      </body>
    </html>
  `);
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor.'
  });
});

module.exports = app;
