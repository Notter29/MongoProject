# Entregable 3: Modelo de datos TLC

## Colecciones

- `yellow_trips`: un documento por fila de los Parquet TLC seleccionados. `_id` determinista (`archivo:posición`) permite reanudar una importación parcial sin duplicar registros.
- `taxi_zones`: catálogo `taxi_zone_lookup.csv`, con `LocationID`, borough, zona y área de servicio.
- `imported_files`: registro de archivos completados por el importador.

## Documento de viaje

```json
{
  "_id": "yellow_tripdata_2019-01.parquet:0",
  "source_file": "yellow_tripdata_2019-01.parquet",
  "vendor_id": 1,
  "pickup_datetime": "2019-01-01T00:46:40Z",
  "dropoff_datetime": "2019-01-01T00:53:20Z",
  "passenger_count": 1,
  "trip_distance": 1.6,
  "rate_code_id": 1,
  "pickup_location_id": 141,
  "dropoff_location_id": 237,
  "payment_type": 1,
  "fare_amount": 7.0,
  "tip_amount": 1.0,
  "total_amount": 11.3
}
```

Los campos opcionales pueden faltar cuando el Parquet contiene `null` o no define esa columna. Las fechas se insertan como BSON Date y los identificadores de zona se relacionan con `_id` en `taxi_zones`. Las ubicaciones TLC son identificadores de zona, no coordenadas.

## Arquitectura de consulta

El dashboard llama controladores Express. Servicios validan límites y parámetros; el repositorio ejecuta pipelines sobre `yellow_trips`. Los informes que necesitan nombres de zonas usan `$lookup` con el pequeño catálogo `taxi_zones`. La búsqueda del catálogo opera mediante una consulta acotada al backend.
