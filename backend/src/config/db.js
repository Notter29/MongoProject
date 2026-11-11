/**
 * @file db.js
 * @description Módulo de configuración y conexión a MongoDB Replica Set.
 * Implementa patrón Singleton para reutilizar el Connection Pool de MongoClient.
 */

const { MongoClient } = require('mongodb');

let client = null;
let dbInstance = null;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/?replicaSet=rs0';
const DB_NAME = process.env.DB_NAME || 'nyc_taxi_analytics';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'yellow_trips';

/**
 * Conecta a MongoDB y retorna la instancia de la base de datos.
 * @returns {Promise<import('mongodb').Db>}
 */
async function connectDB() {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    console.log(`[DB] Conectando a MongoDB en: ${MONGO_URI}...`);
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    // Validar estado del Replica Set
    const adminDb = client.db('admin');
    const isMaster = await adminDb.command({ isMaster: 1 });

    console.log(`[DB] Conectado exitosamente. Modo Replica Set: ${isMaster.setName || 'No configurado'} (Primario: ${isMaster.ismaster})`);
    
    dbInstance = client.db(DB_NAME);
    return dbInstance;
  } catch (error) {
    console.error(`[DB ERROR] Error fatal al conectar a MongoDB: ${error.message}`);
    throw error;
  }
}

/**
 * Retorna la instancia de base de datos activa.
 * @returns {import('mongodb').Db}
 */
function getDB() {
  if (!dbInstance) {
    throw new Error('La base de datos no ha sido inicializada. Llama a connectDB() primero.');
  }
  return dbInstance;
}

/**
 * Retorna la colección principal de eventos.
 * @returns {import('mongodb').Collection}
 */
function getEventosCollection() {
  return getDB().collection(COLLECTION_NAME);
}

/**
 * Cierra la conexión con MongoDB.
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log('[DB] Conexión a MongoDB cerrada.');
  }
}

module.exports = {
  connectDB,
  getDB,
  getEventosCollection,
  closeDB,
  COLLECTION_NAME,
  DB_NAME
};
