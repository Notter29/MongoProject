# NYC Taxi Analytics Dashboard

Proyecto de Bases de Datos II para analizar viajes reales de taxi amarillo de la NYC Taxi & Limousine Commission (TLC), usando MongoDB, consultas de agregación, API REST y un dashboard web.

## Dataset local

- **Fuente pública:** [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page).
- **Datos seleccionados:** archivos oficiales `yellow_tripdata` de enero a agosto de 2019, más el catálogo oficial `taxi_zone_lookup.csv`.
- **Archivos Parquet:** 8 meses, aproximadamente 0.78 GiB descargados.
- **Filas indicadas por los metadatos Parquet:** 57,042,337 viajes.
- **Sin duplicación artificial:** cada documento importado corresponde a una fila del archivo TLC. Los pocos registros del simulador se usan únicamente para demostrar eventos en tiempo real.
- Los 1,219 viajes con fecha de recogida fuera de enero-agosto de 2019 se conservan en la base; los informes filtran el período seleccionado para excluir esas anomalías.
- Los Parquet se guardan fuera de OneDrive/Git en `%LOCALAPPDATA%\parcial-bd\tlc_yellow`.

El requisito académico es `dataSize >= 20 GiB`, no el tamaño comprimido de los Parquet. Compruébalo en el servidor MongoDB tras la importación:

```javascript
db.getSiblingDB("nyc_taxi_analytics").stats(1024 * 1024 * 1024)
```

Consulta `dataSize`, `storageSize`, `indexSize` y `objects` por separado. El importador informa el tamaño del motor al finalizar; no se debe presentar una cifra de `dataSize` antes de medirla.

## Arquitectura

```text
frontend/public  →  Express API / Socket.io  →  MongoDB Replica Set rs0
                       controllers/services      nyc_taxi_analytics
                       repositories               yellow_trips
                                                   taxi_zones
```

- `backend/src/repositories/eventos.repository.js`: agregaciones ejecutadas en MongoDB.
- `backend/src/services/reportes.service.js`: lógica de informes y límites.
- `backend/src/services/nlp/`: traducción a pipelines de lectura con Gemini/Ollama y validación de etapas.
- `backend/src/sockets/realTime.socket.js`: Change Streams para los registros del simulador.
- `frontend/public/`: dashboard SPA con diez informes, gráficos, consulta en lenguaje natural y búsqueda del catálogo de zonas.
- `database/scripts/`: descarga e importación por lotes, materialización de informes y simulador de viajes en vivo.

## Informes

1. Viajes, ingresos y tarifa promedio por día.
2. Zonas de recogida con más viajes.
3. Rutas origen-destino más transitadas.
4. Ingresos por distrito de recogida.
5. Distribución por método de pago.
6. Distribución de viajes por distancia.
7. Demanda por día de semana y hora.
8. Porcentaje de propina por zona de origen.
9. Preguntas en lenguaje natural ejecutadas como Aggregation Pipelines de solo lectura.
10. Últimos viajes, con actualización en vivo mediante Change Streams.

Los informes 1–8 se calculan una sola vez con `database/scripts/materializar_reportes.js` y se sirven desde `analytics_reports`; así el dashboard no vuelve a escanear los 57 millones de viajes por cada consulta. Si se reimporta o modifica el dataset, vuelve a ejecutar el script para refrescar el resumen. Los informes se cargan al abrir su pestaña.

## Requisitos

- Node.js 20 o superior.
- Python 3.10 o superior, con paquetes de `database/scripts/requirements.txt`.
- MongoDB con Replica Set `rs0`, escuchando localmente en el puerto `27018`.
- Para consulta en lenguaje natural: una clave `GEMINI_API_KEY` o un servidor/modelo Ollama local. Si el proveedor no está disponible, hay cinco consultas guiadas seguras.

## Instalación y ejecución en Windows

1. Inicia MongoDB como Replica Set. Ejemplo, con las carpetas previamente creadas:

   ```powershell
   mongod --replSet rs0 --port 27018 --dbpath "$env:LOCALAPPDATA\parcial-bd\mongodb\data" --bind_ip 127.0.0.1
   ```

   En otra terminal, inicia el Replica Set una sola vez:

   ```powershell
   mongosh "mongodb://127.0.0.1:27018" --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27018'}]})"
   ```

2. Descarga los datos públicos:

   ```powershell
   python database\scripts\descargar_dataset_tlc.py
   ```

3. Instala dependencias Python e importa el dataset en lotes:

   ```powershell
   python -m pip install -r database\scripts\requirements.txt
   python database\scripts\importar_tlc.py
   ```

   El importador procesa hasta tres archivos en paralelo y se puede volver a ejecutar: lleva registro de archivos completados y usa identificadores deterministas para reanudar lotes interrumpidos.

4. Al terminar la importación, crea los índices:

   ```powershell
   mongosh "mongodb://127.0.0.1:27018/nyc_taxi_analytics?replicaSet=rs0" database\indexes\indices_tlc.js
   ```

5. Verifica las estadísticas y el Replica Set:

   ```powershell
   mongosh "mongodb://127.0.0.1:27018/nyc_taxi_analytics?replicaSet=rs0" --eval "db.stats(1024*1024*1024)"
   ```

6. Materializa los ocho informes analíticos. Esta operación hace el escaneo inicial y guarda sus resultados en MongoDB:

   ```powershell
   mongosh "mongodb://127.0.0.1:27018/nyc_taxi_analytics?replicaSet=rs0" database\scripts\materializar_reportes.js
   ```

7. Configura el backend:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

   Ajusta `GEMINI_API_KEY` si usarás Gemini. Inicia el servidor:

   ```powershell
   cd backend
   corepack pnpm install --frozen-lockfile
   corepack pnpm start
   ```

   Abre [http://localhost:3000](http://localhost:3000). En VS Code también está disponible la tarea **Run NYC Taxi API (local MongoDB Replica Set)**.

8. Para probar Change Streams, abre otra terminal desde la raíz:

   ```powershell
   python database\scripts\simulador_tiempo_real.py
   ```

## API

- `GET /api/stats`
- `GET /api/zonas?q=Queens`
- `GET /api/informes/1-viajes-periodo`
- `GET /api/informes/2-zonas-recogida`
- `GET /api/informes/3-rutas-populares`
- `GET /api/informes/4-ingresos-distrito`
- `GET /api/informes/5-formas-pago`
- `GET /api/informes/6-distancias`
- `GET /api/informes/7-demanda-horaria`
- `GET /api/informes/8-propinas`
- `POST /api/informes/9-lenguaje-natural` (`{"pregunta":"...","proveedor":"ollama"}`)
- `GET /api/informes/10-viajes-recientes`

## Índices y medición

`database/indexes/indices_tlc.js` crea en una sola operación el índice temporal usado por las consultas de fecha y viajes recientes, además del índice del catálogo de zonas. Para evaluar una consulta de fecha:

```javascript
db.yellow_trips.find({
  pickup_datetime: {
    $gte: ISODate("2019-01-01T00:00:00Z"),
    $lt: ISODate("2019-02-01T00:00:00Z")
  }
}).explain("executionStats")
```

Registra los valores medidos de `executionTimeMillis`, `totalDocsExamined`, `totalKeysExamined` y el plan ganador. Los resultados dependen del equipo y del estado de caché.
