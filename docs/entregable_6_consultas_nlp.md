# Entregable 6: Consultas en lenguaje natural

El informe 9 traduce una pregunta a un Aggregation Pipeline y lo ejecuta en `nyc_taxi_analytics.yellow_trips`. Se puede elegir Gemini u Ollama. Si no está disponible el proveedor, se admiten cinco consultas guiadas locales. Las cifras y el pipeline definitivos se muestran desde los datos que haya cargado MongoDB; este documento no inventa resultados de ejecución.

## Preguntas demostrativas

1. **Pregunta:** ¿Cuáles son las zonas de recogida con más viajes?
   **Pipeline guiado:** agrupar por `pickup_location_id`, contar viajes, sumar `total_amount`, ordenar por viajes y limitar a 10.
2. **Pregunta:** ¿Cuáles son las rutas populares con más viajes?
   **Pipeline guiado:** agrupar por `pickup_location_id` y `dropoff_location_id`, contar viajes y ordenar descendentemente.
3. **Pregunta:** ¿Cuáles fueron los ingresos por mes?
   **Pipeline guiado:** agrupar por año y mes de `pickup_datetime`, sumar `total_amount` y contar viajes.

En cada ejecución, el dashboard muestra la pregunta recibida, el pipeline validado, el proveedor, el tiempo de consulta y los resultados reales de MongoDB.

## Restricciones

El validador solo permite etapas de agregación analíticas explícitas, limita la complejidad y agrega un máximo de resultados. No se permite `$out`, `$merge`, `$where`, `$function` ni otras etapas de modificación o ejecución de código. La consulta opera únicamente sobre la colección configurada, `yellow_trips`.
