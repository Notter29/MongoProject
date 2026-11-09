# Entregable 9: Arquitectura de Software y Diagrama de Comunicación

**Asignatura:** Bases de Datos II — Proyecto Parcial  
**Patrón Arquitectónico:** Arquitectura en Capas Desacopladas (*Layered Architecture*) + Patrón Adapter para IA  

---

## 1. Diagrama General de Arquitectura

```mermaid
flowchart TD
    subgraph CLIENTE["1. Capa de Presentación (Portátil / Navegador Web)"]
        UI["SPA Dashboard (HTML5 / Modern JS / Chart.js)"]
        WS_CLIENT["Cliente Socket.io (Escucha Tiempo Real)"]
        NLP_BOX["Consola NLP (Selector Gemini / Ollama)"]
    end

    subgraph RED["2. Capa de Transporte Seguro"]
        TS["Túnel Privado Tailscale (IP 100.x.y.z)"]
    end

    subgraph BACKEND["3. Capa de Negocio y Aplicación (PC de Escritorio - Puerto 3000)"]
        APP["Servidor Express + Middlewares CORS / JSON"]
        ROUTER["Enrutador REST (/api/informes/...)"]
        CTRL["Controladores (Validación de Parámetros HTTP)"]
        SERV["Servicios de Negocio (reportes.service.js)"]
        
        subgraph NLP_MODULE["Módulo Text-to-Aggregation"]
            NLP_FACADE["nlp.service.js (Orquestador)"]
            VALIDATOR["pipeline.validator.js (Sanitizador de Seguridad)"]
            ADAPT_GEMINI["gemini.provider.js (REST API Cloud)"]
            ADAPT_OLLAMA["ollama.provider.js (Qwen 2.5 Local)"]
        end

        SOCKET_SRV["Socket.io Server (Emisor de Eventos)"]
    end

    subgraph DB_MOTOR["4. Capa de Persistencia y Motor de Base de Datos (Puerto 27017)"]
        REPO["eventos.repository.js (Aggregation Pipelines Puros)"]
        MDB_POOL["Pool de Conexiones MongoClient (min 10, max 50)"]
        MONGO_RS[("MongoDB 7.0 Replica Set 'rs0'\nColección 'eventos' (+20 GB)\nMotor: WiredTiger")]
        OPLOG[("MongoDB Oplog (Change Streams)")]
    end

    UI <-->|HTTP REST Requests| TS
    WS_CLIENT <-->|WebSocket Events| TS
    TS <-->|Puerto 3000| APP
    APP --> ROUTER --> CTRL --> SERV --> REPO
    CTRL --> NLP_MODULE
    NLP_MODULE --> REPO
    REPO --> MDB_POOL --> MONGO_RS
    MONGO_RS -.->|Registro de Inserciones| OPLOG
    OPLOG -.->|Change Stream .watch()| SOCKET_SRV
    SOCKET_SRV -.->|Emite 'nueva_transaccion'| TS
```

---

## 2. Descripción de Componentes y Responsabilidades

### 1. Capa de Presentación (Frontend)
- **Tecnología:** HTML5, CSS moderno (paleta oscura inspirada en centros de operaciones), Chart.js para visualización de series y barras, Socket.io client.
- **Responsabilidad:** Exclusivamente renderizado y captura de eventos de usuario. **No realiza ningún procesamiento o filtrado de datos**: toda métrica se recibe ya calculada desde la base de datos.

### 2. Capa de Aplicación / Backend (Node.js + Express)
- **Rutas (`routes/api.routes.js`):** Expone los 10 endpoints REST documentados.
- **Controladores (`controllers/`):** Valida tipos y rangos de parámetros HTTP (fechas, límites numéricos).
- **Servicios (`services/`):** Aplica lógica de negocio y coordina el servicio NLP.
- **Sockets (`sockets/realTime.socket.js`):** Mantiene el listener de MongoDB Change Streams y transmite de forma asíncrona los eventos de compra a los clientes conectados.

### 3. Módulo de IA Dual (Patrón Adapter)
- **`pipeline.validator.js`:** Capa de seguridad que audita sintácticamente el pipeline JSON antes de enviarlo a la base de datos.
- **`gemini.provider.js`:** Adaptador para la nube mediante Gemini 2.5 Flash.
- **`ollama.provider.js`:** Adaptador para el modelo local Open Source Qwen 2.5 Coder.

### 4. Capa de Acceso a Datos (Repository)
- **`eventos.repository.js`:** Encapsula el 100% de las consultas a MongoDB. Solo utiliza etapas de agregación nativas (`$match`, `$group`, `$sort`, `$limit`, `$facet`). Cero uso de `.toArray()` seguido de `.filter()` en Javascript.

### 5. Motor de Base de Datos (MongoDB Replica Set `rs0`)
- **Modo Replica Set:** Habilita el log de operaciones (`oplog.rs`), requisito indispensable para que Change Streams funcione.
- **Almacenamiento:** Aloja el volumen lógico mayor a 20 GB con compresión snappy en WiredTiger.
- **Indexación:** Gestiona los 6 índices B-Tree en memoria RAM para asegurar resoluciones `IXSCAN` en milisegundos.
