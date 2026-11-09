"""
================================================================================
SIMULADOR DE EVENTOS DE COMPRA EN TIEMPO REAL
Asignatura: Bases de Datos II - Proyecto Parcial (Entregable 7: Tiempo Real)
================================================================================
Este script simula compras concurrentes en la tienda de comercio electrónico,
insertando documentos con event_type='purchase' en MongoDB.

Al ejecutarse (desde la PC de escritorio o remotamente desde el portátil):
1. Inserta la compra directamente en MongoDB Replica Set.
2. MongoDB genera la entrada en su Oplog.
3. El Backend de Node.js detecta el evento mediante Change Streams.
4. Socket.io emite el evento al navegador web.
5. El Dashboard actualiza en vivo:
   - Informe 10: Tabla de transacciones recientes.
   - Informe 1: Tarjetas KPI de ingresos totales y compras acumuladas.
   - Informe 2: Gráfico de productos más vendidos.
================================================================================
"""

import os
import sys
import time
import random
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient

# URI parametrizable por variable de entorno o argumento
# Por defecto conecta a localhost; en el portátil se usa: mongodb://100.x.y.z:27017/?replicaSet=rs0
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/?replicaSet=rs0")
DB_NAME = "ecommerce_analytics"
COLLECTION_NAME = "eventos"

CATALOGO_PRODUCTOS = [
    {"product_id": 1005115, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "apple", "price": 999.00, "nombre": "Apple iPhone 11 Pro 64GB"},
    {"product_id": 1004856, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "samsung", "price": 131.29, "nombre": "Samsung Galaxy A10"},
    {"product_id": 1004767, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "samsung", "price": 251.52, "nombre": "Samsung Galaxy A50"},
    {"product_id": 1005105, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "apple", "price": 1415.74, "nombre": "Apple iPhone 11 Pro Max 256GB"},
    {"product_id": 1307067, "category_id": 2053013558920217191, "category_code": "computers.notebook", "brand": "lenovo", "price": 251.74, "nombre": "Lenovo Ideapad 330"},
    {"product_id": 1002524, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "apple", "price": 544.62, "nombre": "Apple iPhone Xs 64GB"},
    {"product_id": 4804056, "category_id": 2053013554658804075, "category_code": "electronics.audio.headphone", "brand": "apple", "price": 161.98, "nombre": "Apple AirPods 2"},
    {"product_id": 1004833, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "samsung", "price": 172.23, "nombre": "Samsung Galaxy A20"},
    {"product_id": 1004870, "category_id": 2053013555631882655, "category_code": "electronics.smartphone", "brand": "samsung", "price": 285.45, "nombre": "Samsung Galaxy A51"},
    {"product_id": 4802036, "category_id": 2053013554658804075, "category_code": "electronics.audio.headphone", "brand": "xiaomi", "price": 24.50, "nombre": "Xiaomi Redmi AirDots"}
]

USUARIOS_VIP = [549109608, 519107250, 550050854, 512345678, 598765432, 577112233]

def main():
    print("=" * 75)
    print("SIMULADOR DE COMPRAS EN TIEMPO REAL - ECOMMERCE ANALYTICS")
    print(f"Conectando a: {MONGO_URI}...")
    print("Presiona Ctrl+C para detener la simulación.")
    print("=" * 75)

    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[DB_NAME]
        col = db[COLLECTION_NAME]
        print("[OK] Conectado exitosamente a MongoDB Replica Set.\n")
    except Exception as e:
        print(f"[ERROR FATAL] No se pudo conectar a MongoDB: {e}")
        sys.exit(1)

    contador = 0
    try:
        while True:
            contador += 1
            item = random.choice(CATALOGO_PRODUCTOS)
            user_id = random.choice(USUARIOS_VIP)
            ahora = datetime.now(timezone.utc)

            doc = {
                "event_time": ahora,
                "event_type": "purchase",
                "product_id": item["product_id"],
                "category_id": item["category_id"],
                "category_code": item["category_code"],
                "brand": item["brand"],
                "price": round(item["price"] + random.uniform(-5.0, 5.0), 2),
                "user_id": user_id,
                "user_session": str(uuid.uuid4())
            }

            col.insert_one(doc)
            print(f"[{ahora.strftime('%H:%M:%S')}] #{contador:03d} COMPRA INSERTADA -> "
                  f"Producto: {item['nombre']} | Marca: {item['brand'].upper()} | "
                  f"Monto: ${doc['price']:,.2f} | Usuario: {user_id}")

            # Intervalo aleatorio entre 1.5 y 3.0 segundos
            time.sleep(random.uniform(1.5, 3.0))

    except KeyboardInterrupt:
        print("\n[INFO] Simulación detenida por el usuario.")
        client.close()

if __name__ == "__main__":
    main()
