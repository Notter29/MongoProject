# Entregable 8: Índices y medición de consultas

El script `database/indexes/indices_tlc.js` crea los índices después de la carga para que la importación masiva no mantenga árboles adicionales durante cada inserción.

| Índice | Campos | Uso |
|---|---|---|
| `idx_pickup_datetime` | `{ pickup_datetime: -1 }` | Filtros de período, serie temporal y viajes recientes. |
| `idx_taxi_zone_name` | `{ borough: 1, zone: 1 }` | Búsqueda en el catálogo oficial de zonas. |

El índice de `yellow_trips` se crea en una operación aparte de los índices del catálogo para no reconstruir árboles que los informes actuales no utilizan.

## Comparación reproducible

Medir sobre el mismo filtro con y sin el índice correspondiente:

```javascript
db.yellow_trips.find({
  pickup_datetime: {
    $gte: ISODate("2019-01-01T00:00:00Z"),
    $lt: ISODate("2019-02-01T00:00:00Z")
  }
}).explain("executionStats")
```

Registrar el `winningPlan` (`COLLSCAN` o `IXSCAN`), `executionTimeMillis`, `totalDocsExamined` y `totalKeysExamined` en el equipo usado para la sustentación. No se reportan cifras de rendimiento no medidas.
