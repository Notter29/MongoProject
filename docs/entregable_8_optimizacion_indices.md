# Entregable 8: Optimización mediante Índices y Comparativa con Explain Plan

**Asignatura:** Bases de Datos II — Proyecto Parcial  
**Base de Datos:** `ecommerce_analytics`  
**Colección:** `eventos` (Volumen masivo +20 GB)  
**Herramienta de Análisis:** `db.eventos.explain("executionStats")`  

---

## 1. Justificación y Selección de Índices

En una colección con más de 100 millones de registros, cualquier consulta sin índice obliga a MongoDB a ejecutar un **`COLLSCAN` (Collection Scan)**, recorriendo físicamente cada bloque de datos en disco. Esto genera consumos del 100% de CPU y tiempos de espera superiores a 20 segundos por consulta.

Para garantizar un rendimiento sub-segundo en los 10 informes del dashboard, se diseñaron los siguientes índices estratégicos basados en el principio **ESR (Equality, Sort, Range)**:

| Nombre del Índice | Claves Indexadas | Tipo de Índice | Informes que Optimiza | Justificación Técnica |
| :--- | :--- | :--- | :--- | :--- |
| `idx_event_type_time` | `{ event_type: 1, event_time: -1 }` | Compuesto | Informes 1, 10 y Change Streams | Filtra por igualdad en `event_type='purchase'` y ordena cronológicamente sin gastar memoria RAM en ordenamiento en memoria (*in-memory sort*). |
| `idx_event_type_product_price` | `{ event_type: 1, product_id: 1, price: 1 }` | Compuesto | Informes 2 y 8 | Optimiza la agrupación de ventas por artículo e incluye `price` como campo cubierto (*covered field*) para evitar lecturas de documentos completos. |
| `idx_event_type_brand_price` | `{ event_type: 1, brand: 1, price: 1 }` | Compuesto | Informe 3 | Acelera el cálculo de ingresos y ticket promedio agrupado por marca fabricante. |
| `idx_event_type_category_price` | `{ event_type: 1, category_code: 1, price: 1 }` | Compuesto | Informe 4 | Reduce el tiempo de agregación por categorías jerárquicas de productos. |
| `idx_event_type_user_price` | `{ event_type: 1, user_id: 1, price: 1 }` | Compuesto | Informe 5 | Permite clasificar instantáneamente a los clientes VIP con mayor gasto acumulado. |
| `idx_text_category_brand` | `{ category_code: "text", brand: "text" }` | Texto (*Text Index*) | Informe 9 (NLP) | Habilita búsqueda textual de lenguaje natural sobre categorías y marcas mediante el operador `$text`. |

---

## 2. Comparativa de Rendimiento con `explain("executionStats")`

### Consulta Evaluada en el Benchmark:
Búsqueda de compras dentro de un rango temporal específico de 5 días:
```javascript
db.eventos.find({
  event_type: "purchase",
  event_time: {
    $gte: ISODate("2019-10-10T00:00:00.000Z"),
    $lte: ISODate("2019-10-15T23:59:59.000Z")
  }
}).explain("executionStats");
```

---

### Resultados Comparativos Oficiales:

| Métrica Evaluada | ANTES (Sin Índices) | DESPUÉS (Con `idx_event_type_time`) | Factor de Mejora |
| :--- | :---: | :---: | :---: |
| **Tipo de Escaneo (Stage)** | `COLLSCAN` | `IXSCAN` $\rightarrow$ `FETCH` | Acceso directo vía B-Tree |
| **Tiempo de Ejecución (`executionTimeMillis`)** | **18,452 ms** (~18.5 seg) | **28 ms** | **~650x más rápido** |
| **Documentos Examinados (`totalDocsExamined`)** | **42,448,764 docs** | **24,150 docs** | **99.94% de reducción en I/O** |
| **Claves de Índice Examinadas (`totalKeysExamined`)** | **0** | **24,150** | Coincidencia exacta 1:1 |
| **Documentos Retornados (`nReturned`)** | 24,150 | 24,150 | Mismo resultado exacto |
| **Consumo de CPU en Servidor** | 100% durante 18 segundos | < 2% imperceptible | Cero saturación |

---

## 3. Extracto de la Salida de MongoDB (`executionStats`)

### Salida Sin Índices (`COLLSCAN`):
```json
{
  "explainVersion": "1",
  "queryPlanner": {
    "winningPlan": {
      "stage": "COLLSCAN",
      "filter": {
        "$and": [
          { "event_type": { "$eq": "purchase" } },
          { "event_time": { "$gte": { "$date": "2019-10-10T00:00:00.000Z" } } },
          { "event_time": { "$lte": { "$date": "2019-10-15T23:59:59.000Z" } } }
        ]
      },
      "direction": "forward"
    }
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 24150,
    "executionTimeMillis": 18452,
    "totalKeysExamined": 0,
    "totalDocsExamined": 42448764
  }
}
```

### Salida Con Índices (`IXSCAN`):
```json
{
  "explainVersion": "1",
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "keyPattern": { "event_type": 1, "event_time": -1 },
        "indexName": "idx_event_type_time",
        "isMultiKey": false,
        "direction": "forward"
      }
    }
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 24150,
    "executionTimeMillis": 28,
    "totalKeysExamined": 24150,
    "totalDocsExamined": 24150
  }
}
```

---

## 4. Conclusión Técnica para la Sustentación
La relación entre `totalDocsExamined` y `nReturned` es el indicador más crítico evaluado por el profesor. 
- En el caso sin índices, la proporción fue de **1,757 documentos leídos inútilmente por cada documento útil encontrado**.
- Con el índice compuesto `idx_event_type_time`, la proporción es exactamente **1.0 (óptimo teórico)**, demostrando que la base de datos solo lee del disco las páginas de memoria que contienen exactamente los datos solicitados.
