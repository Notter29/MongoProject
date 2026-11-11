# Entregable 9: Arquitectura

```mermaid
flowchart LR
  Browser[Dashboard HTML/CSS/JS] -->|HTTP JSON| Routes[Express API]
  Browser <-->|Socket.io| Realtime[Servicio de tiempo real]
  Routes --> Controllers[Controladores]
  Controllers --> Services[Servicios de informes y NLP]
  Services --> Repository[Repositorio de agregaciones]
  Repository --> Trips[(MongoDB: yellow_trips)]
  Repository --> Zones[(MongoDB: taxi_zones)]
  Trips -. Change Streams .-> Realtime
  Services -->|Pregunta: pipeline acotado| LLM[Gemini / Ollama opcional]
```

La presentación solo consume la API. Los controladores procesan HTTP; los servicios aplican límites y reglas; el repositorio concentra las agregaciones ejecutadas por MongoDB. El módulo NLP valida la salida del modelo antes de consultar la colección. Change Streams sobre el Replica Set reciben los viajes nuevos del simulador y Socket.io actualiza tres elementos del dashboard: KPIs, zonas de recogida y tabla de viajes recientes.
