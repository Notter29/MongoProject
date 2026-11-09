/**
 * @file indices.js
 * @description Definición y creación de índices estratégicos para optimización en MongoDB.
 * 
 * Asignatura: Bases de Datos II - Entregable 8 (Índices y Optimización)
 * Ejecutar con mongosh:
 *   mongosh "mongodb://127.0.0.1:27017/ecommerce_analytics?replicaSet=rs0" indices.js
 */

const dbName = "ecommerce_analytics";
const colName = "eventos";

const db = db.getSiblingDB(dbName);
const col = db.getCollection(colName);

print("=".repeat(70));
print("CREACIÓN DE ÍNDICES ESTRATÉGICOS - COLECCIÓN 'eventos'");
print("=".repeat(70));

// 1. Índice compuesto para Ventas por Periodo y Monitor en Vivo (Informes 1, 10 y Change Streams)
print("\n[1/5] Creando índice compuesto: { event_type: 1, event_time: -1 }...");
col.createIndex(
  { event_type: 1, event_time: -1 },
  { name: "idx_event_type_time", background: true }
);

// 2. Índice compuesto para Top Productos más Vendidos y Disminución de Demanda (Informes 2 y 8)
print("[2/5] Creando índice compuesto: { event_type: 1, product_id: 1, price: 1 }...");
col.createIndex(
  { event_type: 1, product_id: 1, price: 1 },
  { name: "idx_event_type_product_price", background: true }
);

// 3. Índice compuesto para Marcas más Rentables (Informe 3)
print("[3/5] Creando índice compuesto: { event_type: 1, brand: 1, price: 1 }...");
col.createIndex(
  { event_type: 1, brand: 1, price: 1 },
  { name: "idx_event_type_brand_price", background: true }
);

// 4. Índice compuesto para Comparativa de Categorías (Informe 4)
print("[4/5] Creando índice compuesto: { event_type: 1, category_code: 1, price: 1 }...");
col.createIndex(
  { event_type: 1, category_code: 1, price: 1 },
  { name: "idx_event_type_category_price", background: true }
);

// 5. Índice compuesto para Clientes VIP (Informe 5)
print("[5/5] Creando índice compuesto: { event_type: 1, user_id: 1, price: 1 }...");
col.createIndex(
  { event_type: 1, user_id: 1, price: 1 },
  { name: "idx_event_type_user_price", background: true }
);

// 6. Índice de Texto para Búsquedas por Catálogo y Consultas NLP (Informe 9)
print("[6/6] Creando índice de texto: { category_code: 'text', brand: 'text' }...");
col.createIndex(
  { category_code: "text", brand: "text" },
  { name: "idx_text_category_brand", background: true }
);

print("\n" + "=".repeat(70));
print("ÍNDICES ACTIVOS ACTUALMENTE EN LA COLECCIÓN 'eventos':");
print("=".repeat(70));
col.getIndexes().forEach(idx => {
  print(`- Nombre: ${idx.name} | Claves: ${JSON.stringify(idx.key)}`);
});
print("=".repeat(70));
