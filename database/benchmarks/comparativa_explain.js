/**
 * @file comparativa_explain.js
 * @description Benchmark para medir y evidenciar el impacto de los índices con explain("executionStats").
 * Asignatura: Bases de Datos II - Entregable 8 (Índices y Optimización)
 * 
 * Ejecutar con mongosh:
 *   mongosh "mongodb://127.0.0.1:27017/ecommerce_analytics?replicaSet=rs0" comparativa_explain.js
 */

const dbName = "ecommerce_analytics";
const colName = "eventos";
const db = db.getSiblingDB(dbName);
const col = db.getCollection(colName);

print("=".repeat(80));
print("EVALUACIÓN DE RENDIMIENTO CON EXPLAIN(executionStats)");
print("Asignatura: Bases de Datos II - Proyecto Parcial");
print("=".repeat(80));

// Consulta de prueba: Búsqueda de compras en un rango de fechas
const consultaPrueba = {
  event_type: "purchase",
  event_time: {
    $gte: ISODate("2019-10-10T00:00:00.000Z"),
    $lte: ISODate("2019-10-15T23:59:59.000Z")
  }
};

print("\nEjecutando explain('executionStats') sobre consulta de compras por fecha...");
const explainResult = col.find(consultaPrueba).explain("executionStats");

const stats = explainResult.executionStats;
const winningPlan = explainResult.queryPlanner.winningPlan;

// Extraer etapa principal (IXSCAN o COLLSCAN)
let stagePrincipal = winningPlan.stage;
if (winningPlan.inputStage) {
  stagePrincipal = winningPlan.inputStage.stage + " -> " + winningPlan.stage;
}

print("\n" + "-".repeat(80));
print("RESULTADOS DE LA CONSULTA:");
print("-".repeat(80));
print(`Etapa de ejecución (Stage):    ${stagePrincipal}`);
print(`Tiempo de ejecución:          ${stats.executionTimeMillis} ms`);
print(`Documentos examinados:         ${stats.totalDocsExamined.toLocaleString()}`);
print(`Claves de índice examinadas:   ${stats.totalKeysExamined.toLocaleString()}`);
print(`Documentos retornados:         ${stats.nReturned.toLocaleString()}`);
print("-".repeat(80));

if (stats.totalDocsExamined > 100000 && stats.totalKeysExamined === 0) {
  print("[DIAGNÓSTICO]: Se está ejecutando un COLLSCAN (Escaneo completo de colección).");
  print("Se recomienda aplicar el índice compuesto: { event_type: 1, event_time: -1 }");
} else {
  print("[DIAGNÓSTICO]: ¡Consulta optimizada mediante IXSCAN (Escaneo de índice)!");
}
print("=".repeat(80));
