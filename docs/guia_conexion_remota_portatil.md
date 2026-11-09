# 🛰️ Guía de Conexión Remota para el Portátil (Instancia de Gemini & Sustentación)

**Asignatura:** Bases de Datos II — Proyecto Parcial  
**Arquitectura:** Cliente Remoto (Portátil en la Universidad) $\rightarrow$ Servidor Host (PC de Escritorio en Casa)  
**Base de Datos Activa:** `ecommerce_analytics` (+25 GB BSON / 116M+ documentos / MongoDB Replica Set `rs0`)  

---

## 1. Direcciones IP Disponibles de este PC de Escritorio (Servidor)

Este PC de escritorio cuenta con las siguientes interfaces de red:

| Tipo de Red | Dirección IP del PC de Escritorio | Cuándo Usarla |
| :--- | :---: | :--- |
| **VPN ZeroTier (Activa en este PC)** | `10.130.192.233` | Si unes el portátil a la misma red de ZeroTier. |
| **VPN Tailscale (Recomendada)** | `100.x.y.z` | Si instalas Tailscale en ambos equipos e inicias sesión con tu misma cuenta. |
| **Red Local (LAN Casa)** | `192.168.1.13` | Para realizar pruebas previas desde el portátil dentro de tu misma casa. |

---

## 2. Preparación Obligatoria del PC de Escritorio (Antes de Salir de Casa)

1. **Desactivar la Suspensión de Windows:**
   - *Configuración $\rightarrow$ Sistema $\rightarrow$ Inicio/apagado y suspensión* $\rightarrow$ **NUNCA**.
2. **Ejecutar Reglas del Firewall (como Administrador):**
   ```powershell
   & "M:\Proyecto base de datos2\scripts_auxiliares\configurar_firewall.ps1"
   ```
3. **Mantener Servicios Activos:**
   - MongoDB 7.0 Replica Set (`rs0`) en puerto `27017`.
   - Backend Express + Socket.io en puerto `3000`.
4. **Plan de Respaldo:**
   - Dejar AnyDesk con clave de acceso desatendido activa.

---

## 3. Acciones en el Portátil (En la Universidad)

### A. Abrir el Dashboard
```text
http://<IP_PC_ESCRITORIO>:3000
```
Verifica que el indicador marque `🟢 En vivo (Change Streams)` y `dataSize: 25.45 GB`.

### B. Conectar MongoDB Compass
Cadena de conexión en el portátil:
```text
mongodb://<IP_PC_ESCRITORIO>:27017/?replicaSet=rs0
```

### C. Inyectar Compras en Vivo (Simulador)
```powershell
$env:MONGO_URI="mongodb://<IP_PC_ESCRITORIO>:27017/?replicaSet=rs0"
py database/scripts/simulador_tiempo_real.py
```

---

## 4. Prompt para la Instancia de Gemini en el Portátil

Copia y pega este prompt al iniciar la conversación con Gemini en el portátil:

```markdown
Hola Gemini. Estoy en mi portátil en la universidad sustentando el Proyecto Parcial de Bases de Datos II ("Dashboard para análisis de grandes volúmenes de datos").

Toda la infraestructura pesada está corriendo en mi PC de escritorio en casa y nos conectamos mediante VPN remota:
- IP del PC de escritorio: <PEGA_AQUÍ_LA_IP_EJ_10.130.192.233_O_100.x.y.z>
- MongoDB 7.0 Replica Set 'rs0' en el puerto 27017 (escuchando en 0.0.0.0).
- Base de datos: 'ecommerce_analytics', colección: 'eventos' con más de 25 GB lógicos (dataSize >= 20 GB) y 116 millones de registros.
- Backend Node.js (Express + Socket.io + Change Streams) en el puerto 3000.
- Dashboard accesible en: http://<IP_PC_ESCRITORIO>:3000

Tu rol en este portátil es asistirme durante la sustentación:
1. Probar conectividad HTTP hacia http://<IP_PC_ESCRITORIO>:3000/api/stats.
2. Ayudarme a ejecutar el script 'simulador_tiempo_real.py' apuntando a la cadena 'mongodb://<IP_PC_ESCRITORIO>:27017/?replicaSet=rs0' para inyectar compras en tiempo real.
3. Proporcionarme explicaciones técnicas ante preguntas del profesor sobre la optimización de índices (COLLSCAN vs IXSCAN) y la arquitectura en capas.
¿Entendido? Confírmame y verifica la conexión a la API.
```
