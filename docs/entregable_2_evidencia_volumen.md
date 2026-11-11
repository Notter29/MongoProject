# Entregable 2: Volumen real almacenado

**Base:** `nyc_taxi_analytics`
**Colección principal:** `yellow_trips`
**Umbral solicitado:** `dataSize >= 20 GiB`

## Fuente y carga

Se descargan los 8 archivos Parquet oficiales de viajes amarillos de enero a agosto de 2019 y el catálogo TLC de zonas. Los archivos Parquet ocupan aproximadamente **0.78 GiB** en disco y sus metadatos reportan **57,042,337 filas**. El importador procesa lotes en paralelo y no duplica filas para inflar el volumen.

Los registros originales permanecen íntegros. Se detectaron 1,219 fechas de recogida fuera del período seleccionado (828 anteriores y 391 posteriores); los informes las excluyen mediante un filtro de período, sin borrar documentos fuente.

El tamaño de los Parquet no demuestra el volumen almacenado en MongoDB. La evidencia válida se obtiene después de completar la importación:

```javascript
db.getSiblingDB("nyc_taxi_analytics").stats(1024 * 1024 * 1024)
```

Conservar en esta sección una captura o salida actualizada que incluya `dataSize`, `storageSize`, `indexSize`, `objects` y `ok`. `dataSize` debe ser al menos 20 GiB; `indexSize` no se suma para alcanzar el requisito.

El importador muestra las estadísticas finales al terminar. Si el valor real de `dataSize` es inferior a 20 GiB, se deben añadir más meses de fuente TLC y volver a medir, sin replicar registros.
