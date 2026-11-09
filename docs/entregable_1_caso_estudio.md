# Entregable 1: Descripción del Caso de Estudio

**Asignatura:** Bases de Datos II — Proyecto Parcial  
**Título del Proyecto:** Plataforma de Analítica y Dashboard para Grandes Volúmenes de Datos (+20 GB)  
**Dominio:** Comercio Electrónico y Comportamiento de Clientes (*eCommerce Behavior Analytics*)  

---

## 1. ¿Qué problema busca resolver?
Las tiendas de comercio electrónico de escala masiva procesan millones de interacciones diarias: usuarios navegando por el catálogo, añadiendo artículos a sus carritos de compra y finalizando transacciones. Sin embargo, procesar esta inmensa masa de datos crudos para identificar cuellos de botella y oportunidades comerciales plantea un serio desafío de infraestructura de bases de datos:

1. **Latencia crítica en reportes analíticos:** Las consultas tradicionales sobre decenas de millones de registros sufren de tiempos de respuesta inaceptables (más de 20 segundos por consulta) si no se diseñan índices adecuados y agregaciones en el motor.
2. **Desconexión con el tiempo real:** La gerencia suele tomar decisiones con datos retrasados por horas o días (procesamiento batch), perdiendo la capacidad de reaccionar de inmediato a picos de demanda o fallos en el embudo de ventas.
3. **Barreras técnicas para usuarios de negocio:** Los analistas comerciales a menudo no dominan la sintaxis de consultas no relacionales (Aggregation Pipelines de MongoDB), lo que genera dependencia de desarrolladores para extraer respuestas básicas.

Este proyecto resuelve estos problemas integrando **MongoDB en Replica Set con Aggregation Pipelines nativos**, actualización reactiva en tiempo real mediante **Change Streams** y un asistente inteligente **Text-to-Aggregation con soporte dual (Gemini API y Ollama Qwen 2.5 local)**.

---

## 2. ¿Quién utilizaría el sistema?
El sistema está diseñado para tres perfiles de usuarios dentro de la organización:

- **Gerente de Operaciones y Ventas (COO / Head of Sales):** Monitorea en tiempo real los ingresos diarios, el volumen de compras y los productos más demandados para ajustar inventario y logística.
- **Analista de Marketing y Conversión:** Analiza el embudo de conversión (views vs cart vs purchase), la tasa de abandono de carrito y los mapas de calor de horarios para programar promociones y descuentos dirigidos.
- **Administrador de Base de Datos (DBA):** Supervisa el consumo de almacenamiento (`dataSize`, `storageSize`), audita el plan de ejecución de las consultas (`explain("executionStats")`) y valida el correcto aprovechamiento de los índices B-Tree en memoria.

---

## 3. ¿Qué información se encuentra almacenada?
La base de datos almacena el registro cronológico detallado de eventos de comportamiento de usuarios proveniente del conjunto de datos real de Kaggle (*eCommerce behavior data from multi-category store*):

- **Marca temporal (`event_time`):** Fecha y hora precisa en formato UTC (BSON `ISODate`).
- **Tipo de evento (`event_type`):** Clasificación del evento (`view`, `cart`, `remove_from_cart`, `purchase`).
- **Identificador de producto (`product_id`):** Código numérico único del artículo comercializado.
- **Categoría (`category_id` y `category_code`):** Identificador y taxonomía jerárquica del producto (ej. `electronics.smartphone`, `computers.notebook`).
- **Marca comercial (`brand`):** Fabricante o marca del producto (ej. Apple, Samsung, Xiaomi, Lenovo).
- **Precio unitario (`price`):** Valor monetario en dólares estadounidenses (USD) del artículo.
- **Identificador de usuario (`user_id`):** Código único del consumidor para trazabilidad y fidelización.
- **Sesión de navegación (`user_session`):** UUID representativo de la sesión activa del usuario.

---

## 4. ¿Qué decisiones comerciales pueden tomarse a partir de los informes?

| Informe | Decisión Estratégica / Operativa |
| :--- | :--- |
| **Informe 1 (Ventas e Ingresos del Periodo)** | Ajuste presupuestario y proyección financiera basada en la tendencia diaria de facturación y ticket promedio. |
| **Informe 2 (Top Productos Más Vendidos)** | Planificación de compras a proveedores y reabastecimiento prioritario en almacén para evitar rotura de stock (*stockout*). |
| **Informe 3 (Marcas Más Rentables)** | Negociación de mejores márgenes de comisión y acuerdos de exclusividad con las marcas que generan mayor volumen de facturación. |
| **Informe 4 (Comparativa de Categorías)** | Redistribución del espacio publicitario y banners en la página principal según el peso relativo de cada departamento. |
| **Informe 5 (Clientes VIP)** | Inclusión en programas de lealtad, asignación de ejecutivos de cuenta dedicados y campañas de retención personalizada. |
| **Informe 6 (Embudo de Conversión & Abandono)** | Detección de fugas en la pasarela de pagos y activación de correos de recuperación de carritos abandonados. |
| **Informe 7 (Mapa de Calor 7x24)** | Programación de flash-sales, notificaciones push y mantenimiento de servidores en las horas de menor actividad. |
| **Informe 8 (Detección de Caída de Demanda)** | Alerta temprana sobre productos obsoletos o con sobreprecio para aplicar promociones de liquidación antes de acumular stock muerto. |
| **Informe 9 (Consultas en Lenguaje Natural)** | Democratización de la toma de decisiones: analistas comerciales pueden interrogar la base de datos sin redactar código JSON complejo. |
| **Informe 10 (Monitor de Transacciones en Vivo)** | Control en tiempo real de picos de ventas durante eventos comerciales de alta intensidad (Black Friday, Cyber Monday). |

---

## 5. ¿Por qué resulta útil analizar grandes volúmenes de datos en este contexto?
En el comercio electrónico contemporáneo, las muestras pequeñas o agregaciones preliminares ocultan patrones críticos:
1. **La "Larga Cola" (Long Tail):** Miles de productos individuales venden pocas unidades cada uno, pero sumados representan hasta el 40% de la facturación total. Solo analizando el volumen completo de más de 20 GB se puede cuantificar este fenómeno.
2. **Comportamiento real vs simulado:** Los datos masivos reflejan el comportamiento estocástico de millones de sesiones reales, permitiendo calcular con precisión decimal la verdadera tasa de abandono de carrito.
3. **Estrés de infraestructura:** Demuestra la capacidad de la base de datos para responder en menos de 50 milisegundos mediante índices compuestos sobre una masa documental que supera los 100 millones de registros.
