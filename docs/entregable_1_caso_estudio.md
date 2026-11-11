# Entregable 1: Caso de estudio — Viajes en taxis amarillos de NYC

**Asignatura:** Bases de Datos II
**Fuente:** NYC Taxi & Limousine Commission (TLC), Yellow Taxi Trip Records
**Cobertura descargada:** enero a agosto de 2019

## Problema y usuarios

El sistema ayuda a analizar la demanda y la operación del servicio de taxi en Nueva York. Un operador puede detectar horas y zonas de alta demanda, rutas frecuentes, distribución de tarifas y propinas. Los usuarios principales son analistas de movilidad, responsables de operaciones y administradores de bases de datos.

## Información

Cada documento de `yellow_trips` conserva un viaje público TLC con fechas de recogida y destino, cantidad de pasajeros, millas recorridas, zonas de origen y destino, método de pago, tarifa, propina y total. La colección `taxi_zones` contiene el catálogo oficial de zonas y distritos. El archivo fuente original se conserva localmente para trazabilidad.

Los valores `PULocationID` y `DOLocationID` se relacionan con el catálogo de zonas TLC; no son coordenadas GPS.

## Informes y decisiones

| Informe | Uso para la toma de decisiones |
|---|---|
| Viajes e ingresos por día | Comparar actividad y recaudación por fecha. |
| Zonas con más recogidas | Identificar dónde conviene redistribuir vehículos. |
| Rutas más transitadas | Reconocer trayectos frecuentes para planificación. |
| Ingresos por distrito | Comparar recaudación entre boroughs. |
| Métodos de pago | Medir el uso de tarjeta, efectivo y otros medios. |
| Distancias | Entender la mezcla de viajes cortos y largos. |
| Demanda por día y hora | Identificar turnos de mayor demanda. |
| Propinas por zona | Comparar propinas con tarifa base en zonas con suficientes viajes. |
| Lenguaje natural | Permitir preguntas analíticas sin escribir JSON de agregación. |
| Viajes recientes en vivo | Observar nuevas inserciones con Change Streams. |

Las agregaciones, filtros, agrupamientos y ordenamientos se ejecutan en MongoDB. El dashboard consume la API REST y no se conecta directamente a la base.
