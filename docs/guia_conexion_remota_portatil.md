# Guía de acceso al dashboard

## En el mismo equipo

1. Inicia el MongoDB Replica Set `rs0` local por el puerto `27018`.
2. Inicia el backend desde `backend` con `corepack pnpm start`.
3. Abre `http://localhost:3000`.

El dashboard y la API son accesibles por el equipo anfitrión. MongoDB está configurado por defecto para enlazarse a `127.0.0.1`; no se debe exponer el puerto `27018` directamente a Internet.

## Simular un viaje en tiempo real

En una terminal adicional desde la raíz del proyecto:

```powershell
python database\scripts\simulador_tiempo_real.py
```

Los documentos de demo se insertan en `nyc_taxi_analytics.yellow_trips`; MongoDB los publica por Change Streams y Socket.io los presenta en el monitor, actualizando además las tarjetas y el gráfico de zonas.

## Verificar la API

```powershell
Invoke-RestMethod http://localhost:3000/api/stats
Invoke-RestMethod "http://localhost:3000/api/zonas?q=Queens"
```
