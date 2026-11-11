# Explicación del código: NYC Taxi Analytics

## Flujo de datos

1. `descargar_dataset_tlc.py` descarga Parquet mensuales de NYC TLC y el catálogo de zonas a `%LOCALAPPDATA%\parcial-bd\tlc_yellow`.
2. `importar_tlc.py` lee bloques PyArrow, normaliza las columnas, inserta cada viaje y registra archivos completados. El identificador determinista por fila permite reanudar lotes interrumpidos.
3. `indices_tlc.js` crea índices de fecha, zona, pago, distancia y nombres de zona una vez cargada la colección.
4. El navegador consume endpoints Express. Controladores y servicios aplican validaciones; `eventos.repository.js` ejecuta la agregación en MongoDB y retorna resúmenes pequeños al frontend.
5. El módulo NLP solicita a Gemini u Ollama un pipeline limitado. El validador rechaza etapas no permitidas y agrega un máximo a los resultados antes de ejecutar en `yellow_trips`.
6. El simulador inserta documentos marcados como demo. Change Streams ignora las filas históricas que contienen `source_file` y emite únicamente los viajes de demostración al dashboard.

## Informes implementados

| N.º | Consulta |
|---|---|
| 1 | Viajes, ingresos y tarifa promedio agrupados por fecha. |
| 2 | Zonas de recogida con mayor número de viajes. |
| 3 | Rutas de origen a destino más transitadas. |
| 4 | Ingresos agregados por distrito. |
| 5 | Conteo e ingresos por método de pago. |
| 6 | Distribución de viajes por millas. |
| 7 | Matriz de demanda por día y hora. |
| 8 | Propinas relativas a tarifa por zona. |
| 9 | Aggregation Pipeline generado desde una pregunta natural. |
| 10 | Viajes recientes y actualizaciones del simulador en tiempo real. |

El dashboard carga informes al abrir cada pestaña para evitar ocho escaneos simultáneos de una colección masiva.
