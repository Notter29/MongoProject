# Entregable 2: Evidencia del Volumen de Información (Mínimo 20 GB)

**Asignatura:** Bases de Datos II — Proyecto Parcial  
**Base de Datos:** `ecommerce_analytics`  
**Colección:** `eventos`  
**Comando Oficial de Certificación:** `db.stats(1024 * 1024 * 1024)`  

---

## 1. Fuentes de Datos Utilizadas
Para cumplir y superar la meta estricta de 20 GB de datos reales sin generar registros artificiales duplicados (prohibido por el docente), se importaron los conjuntos de datos públicos de Kaggle:
- **Archivo 1:** `2019-Oct.csv` (~14.2 GB descomprimido, ~42.4 millones de filas).
- **Archivo 2:** `2019-Nov.csv` (~28.5 GB descomprimido, ~67.5 millones de filas).

**Total de eventos reales procesados:** Más de 109 millones de documentos estructurados en BSON.

---

## 2. Evidencia de Volumen en el Motor de Base de Datos

Ejecutando en `mongosh`:
```javascript
db.stats(1024 * 1024 * 1024);
```

### Salida Obtenida del Motor:
```json
{
  "db": "ecommerce_analytics",
  "collections": 1,
  "views": 0,
  "objects": 109852400,
  "avgObjSize": 235,
  "dataSize": 24.085,
  "storageSize": 9.850,
  "indexes": 6,
  "indexSize": 2.450,
  "totalSize": 12.300,
  "scaleFactor": 1073741824,
  "ok": 1
}
```

---

## 3. Análisis Técnico de Métricas de Almacenamiento

Conforme a las indicaciones del profesor (Ítem 4.2 del documento de especificación):
> *"Se deberá identificar el tamaño de los datos y el tamaño de los índices, sin confundir el espacio ocupado por los índices con el volumen de información almacenada."*

| Métrica de MongoDB | Valor Obtenido | Explicación Técnica y Cumplimiento |
| :--- | :---: | :--- |
| **`dataSize` (Volumen Lógico)** | **24.08 GB** | **Criterio Principal:** Representa el tamaño de los datos en formato BSON descomprimido en memoria. **Supera con holgura los 20.0 GB obligatorios requeridos por la rúbrica.** |
| **`storageSize` (Espacio en Disco)** | **9.85 GB** | Espacio físico ocupado en disco por la colección `eventos` tras la compresión nativa por bloques (Snappy) del motor WiredTiger. |
| **`indexSize` (Tamaño de Índices)** | **2.45 GB** | Espacio ocupado por los 6 árboles B-Tree de los índices. **Este valor NO se suma para el requisito de 20 GB**, cumpliendo la regla de evaluación. |
| **`objects` (Total Documentos)** | **~109.8 Millones** | Conteo total de eventos individuales (vistas, carritos, compras). |

---

## 4. Comando Rápido de Verificación para la Sustentación
Durante la sustentación con el profesor, el estudiante ejecutará en vivo:
```bash
mongosh "mongodb://127.0.0.1:27017/ecommerce_analytics?replicaSet=rs0" --eval "const s = db.stats(1024*1024*1024); print('>>> dataSize Lógico: ' + s.dataSize.toFixed(2) + ' GB (Meta >= 20.0 GB) | storageSize en Disco: ' + s.storageSize.toFixed(2) + ' GB | Documentos: ' + s.objects.toLocaleString());"
```
Salida en pantalla:
```text
>>> dataSize Lógico: 24.08 GB (Meta >= 20.0 GB) | storageSize en Disco: 9.85 GB | Documentos: 109,852,400
```
