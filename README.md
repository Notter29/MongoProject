# 🚀 Dashboard de Análisis para Grandes Volúmenes de Datos (+20 GB)

> **Asignatura:** Bases de Datos II — Proyecto Parcial  
> **Motor de Base de Datos:** MongoDB 7.0 (Modo Replica Set `rs0` con Change Streams)  
> **Volumen de Datos:** Más de 109 millones de eventos (`dataSize` $\ge$ 20.0 GB lógicos)  
> **Arquitectura:** Capas Desacopladas (Node.js Express + Socket.io + MongoDB + IA Dual Gemini/Ollama)  

---

## 📌 1. Descripción del Proyecto
Este proyecto implementa una plataforma integral de análisis de datos masivos para comercio electrónico sobre el dataset de Kaggle (*eCommerce behavior data from multi-category store*). Permite procesar y visualizar patrones de compra, embudos de conversión, rentabilidad de marcas y tendencias mediante:

1. **Procesamiento 100% en el Motor:** Agregaciones nativas (`$match`, `$group`, `$sort`, `$limit`, `$facet`). Cero filtrado manual en arrays de Node.js.
2. **Actualización en Tiempo Real:** Integración con **MongoDB Change Streams** y WebSockets (Socket.io) para reflejar compras al instante sin recargar la página.
3. **Consultas en Lenguaje Natural (Text-to-Aggregation):** Soporte dual e interactivo entre **Google Gemini API** (Nube ultrarrápida) y **Ollama Qwen 2.5** (100% Local / Open Source / Offline) con validación estricta de seguridad.
4. **Optimización con Índices Compuestos:** Reducción comprobada del tiempo de consulta de ~18.5 segundos (`COLLSCAN`) a menos de 35 milisegundos (`IXSCAN`) verificado con `explain("executionStats")`.

---

## 📊 2. Catálogo de los 10 Informes Implementados

| No. | Nombre del Informe | Pregunta Comercial que Resuelve | Tipo de Consulta | Actualización |
| :---: | :--- | :--- | :---: | :---: |
| **1** | **Ventas e Ingresos del Periodo** | ¿Cuál es la facturación diaria y el ticket promedio acumulado? | `$facet` + `$group` por fecha | **Tiempo Real (1)** ⚡ |
| **2** | **Top Productos Más Vendidos** | ¿Qué artículos concentran la mayor demanda e ingresos? | `$group` por `product_id` + `$sort` | **Tiempo Real (2)** ⚡ |
| **3** | **Marcas Más Rentables** | ¿Qué fabricantes generan mayor volumen y ticket promedio? | `$group` por `brand` | Agregación MongoDB |
| **4** | **Comparativa de Categorías** | ¿Cómo se distribuye la facturación entre los departamentos? | `$group` por `category_code` | Agregación MongoDB |
| **5** | **Clientes VIP** | ¿Quiénes son los clientes con mayor valor de vida (LTV)? | `$group` por `user_id` + `$sort` | Agregación MongoDB |
| **6** | **Embudo de Conversión** | ¿Cuál es la tasa de pérdida entre vistas, carritos y compras? | `$group` por `event_type` | Agregación MongoDB |
| **7** | **Mapa de Calor de Demanda** | ¿Cuáles son los días y franjas horarias con más compras? | `$isoDayOfWeek` + `$hour` | Agregación MongoDB |
| **8** | **Detección de Caída de Demanda** | ¿Qué artículos tuvieron caídas drásticas entre periodos? | `$cond` comparativo en `$group` | Agregación MongoDB |
| **9** | **Consultas en Lenguaje Natural** | Formulación de preguntas libres traducidas a Pipelines. | Text-to-Aggregation seguro | **Dual: Gemini / Ollama** |
| **10** | **Monitor de Transacciones en Vivo** | ¿Qué compras se están procesando en este instante? | `$sort` por `event_time: -1` | **Tiempo Real (3)** ⚡ |

---

## 🏗️ 3. Estructura del Repositorio

```text
repo_github/
├── backend/
│   ├── src/
│   │   ├── config/db.js                  <-- Singleton de conexión a MongoDB Replica Set
│   │   ├── repositories/eventos.repository.js <-- Consultas de agregación nativas
│   │   ├── services/
│   │   │   ├── reportes.service.js       <-- Lógica de negocio de los 10 informes
│   │   │   └── nlp/                      <-- Módulo Text-to-Aggregation
│   │   │       ├── nlp.service.js        <-- Orquestador principal
│   │   │       ├── gemini.provider.js    <-- Adaptador Gemini REST API
│   │   │       ├── ollama.provider.js    <-- Adaptador Ollama Qwen 2.5 local
│   │   │       └── pipeline.validator.js <-- Sanitizador de seguridad de consultas
│   │   ├── controllers/                  <-- Manejo de peticiones HTTP
│   │   ├── routes/api.routes.js          <-- Definición de endpoints REST
│   │   ├── sockets/realTime.socket.js    <-- MongoDB Change Streams -> Socket.io
│   │   └── app.js                        <-- Configuración Express y middlewares
│   ├── server.js                         <-- Punto de entrada del backend (0.0.0.0:3000)
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── public/                           <-- SPA moderna sin dependencias complejas
│       ├── index.html                    <-- Dashboard con 5 pestañas temáticas
│       ├── styles/main.css               <-- Paleta oscura, animaciones y mapa de calor
│       └── js/
│           ├── app.js                    <-- Controlador principal del dashboard
│           ├── api.js                    <-- Cliente REST
│           ├── socket.js                 <-- Cliente Socket.io reactivo
│           ├── charts.js                 <-- Gráficos interactivos Chart.js
│           └── nlp.js                    <-- Interfaz de consultas IA y visor de JSON
├── database/
│   ├── scripts/
│   │   ├── importar_datos.py             <-- Ingesta masiva optimizada por bloques
│   │   └── simulador_tiempo_real.py      <-- Generador de compras para sustentación en vivo
│   ├── indexes/indices.js                <-- Creación de índices compuestos y de texto
│   └── benchmarks/comparativa_explain.js <-- Script para contrastar COLLSCAN vs IXSCAN
└── docs/                                 <-- Entregables académicos oficiales del profesor
    ├── entregable_1_caso_estudio.md
    ├── entregable_2_evidencia_volumen.md
    ├── entregable_3_modelo_datos.md
    ├── entregable_6_consultas_nlp.md
    ├── entregable_8_optimizacion_indices.md
    └── entregable_9_arquitectura.md
```

---

## ⚙️ 4. Guía de Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** v20 o superior.
- **Python** 3.10 o superior (con `pandas` y `pymongo`).
- **MongoDB** 7.0 instalado con soporte de Replica Set (`rs0`).

---

### Paso 1: Configurar Variables de Entorno del Backend
En la carpeta `backend/`:
```bash
cp .env.example .env
```
Edita `.env` según tus necesidades:
```env
PORT=3000
HOST=0.0.0.0
MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
DB_NAME=ecommerce_analytics
COLLECTION_NAME=eventos

# Proveedor por defecto ('gemini' o 'ollama')
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash

# Si se usa Ollama local
OLLAMA_URL=http://127.0.0.1:11434/api/generate
OLLAMA_MODEL=qwen2.5-coder:7b
```

---

### Paso 2: Iniciar MongoDB en Modo Replica Set
Si utilizas los scripts auxiliares provistos:
```bat
scripts_auxiliares\iniciar_mongodb.bat
```
O manualmente desde terminal:
```bash
mongod --config mongod.cfg
```
En `mongosh` inicializar si es primera vez:
```javascript
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })
```

---

### Paso 3: Iniciar el Servidor Backend
En la carpeta `backend/`:
```bash
pnpm install   # o npm install
node server.js
```
El servidor confirmará:
```text
[DB] Conectado exitosamente. Modo Replica Set: rs0 (Primario: true)
[CHANGE STREAM] Conectado exitosamente al Oplog de MongoDB.
[OK] Servidor activo escuchando en: http://0.0.0.0:3000
```

---

### Paso 4: Abrir el Dashboard
Abre tu navegador web en:
- **Localmente:** `http://localhost:3000`
- **Desde el portátil (vía Tailscale):** `http://100.x.y.z:3000`

---

## 🎯 5. Guía para la Sustentación con el Docente

Durante la sustentación frente al profesor, sigue esta secuencia probada para demostrar el cumplimiento de todos los puntos de la rúbrica (5.0 / 5.0):

1. **Evidencia del Volumen de 20 GB:**
   - Abre MongoDB Compass o mongosh en el portátil conectado a `mongodb://100.x.y.z:27017/?replicaSet=rs0`.
   - Ejecuta:
     ```javascript
     db.stats(1024 * 1024 * 1024)
     ```
   - Señala al docente que el campo `dataSize` es $\ge$ 20.0 GB (sin contar el tamaño de los índices).

2. **Demostración de los 10 Informes:**
   - Navega por las pestañas del Dashboard y explica el propósito de negocio de cada métrica (ver Entregable 1).

3. **Demostración en Tiempo Real (Change Streams):**
   - Mantén abierta la pestaña **"⚡ Tiempo Real & KPIs"** en el navegador.
   - En una terminal, ejecuta el simulador:
     ```bash
     py database/scripts/simulador_tiempo_real.py
     ```
   - Muestra cómo la tabla de **Últimas Transacciones (Informe 10)** se actualiza sola al instante, y cómo las tarjetas de **Ingresos Totales (Informe 1)** y el gráfico de **Top Productos (Informe 2)** van incrementando sin refrescar la página (`F5`).

4. **Demostración de Lenguaje Natural (Gemini vs Ollama):**
   - Pasa a la pestaña **"🤖 Consultas IA"**.
   - Haz clic en una de las preguntas sugeridas con **Gemini API**. Muestra el Pipeline JSON generado y los resultados devueltos por MongoDB.
   - Si el profesor pide comprobar un modelo local/open source, cambia el selector a **Ollama Local (Qwen 2.5)** y haz otra consulta para evidenciar el funcionamiento 100% offline.

5. **Demostración de Optimización con Índices (`explain`):**
   - En mongosh, ejecuta:
     ```javascript
     load("database/benchmarks/comparativa_explain.js")
     ```
   - Explica la diferencia entre el escaneo secuencial `COLLSCAN` (~18 segundos) y el uso de índices compuestos `IXSCAN` (< 35 ms).

---

## 🧹 6. Plan de Limpieza Post-Sustentación
Una vez calificada la materia, puedes borrar los más de 50 GB de archivos pesados y base de datos con un solo clic ejecutando:
```bat
scripts_auxiliares\limpiar_todo.bat
```
Esto dejará tu repositorio `repo_github` intacto para conservar tu portafolio en GitHub sin ocupar espacio en disco.
