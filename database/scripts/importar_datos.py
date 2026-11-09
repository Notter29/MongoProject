"""
================================================================================
SCRIPT DE IMPORTACIÓN MASIVA OPTIMIZADA A MONGODB (+20 GB)
Asignatura: Bases de Datos II - Proyecto Parcial
Caso de Estudio: eCommerce Behavior Data (Kaggle)
================================================================================
Este script realiza la ingesta masiva de los eventos de comercio electrónico
leyendo los archivos CSV en bloques (chunks) e insertándolos en MongoDB mediante
operaciones por lotes sin orden (ordered=False) para maximizar el throughput.

Garantiza la conversión de tipos:
- event_time: ISODate (datetime de Python)
- price: float
- product_id, category_id, user_id: int64
- event_type, category_code, brand, user_session: string
================================================================================
"""

import os
import sys
import time
from datetime import datetime
import pandas as pd
from pymongo import MongoClient

# Configuración de conexión y rutas
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/?replicaSet=rs0")
DB_NAME = "ecommerce_analytics"
COLLECTION_NAME = "eventos"
CHUNK_SIZE = 100_000  # Lote de 100 mil registros por inserción

ARCHIVE_DIR = r"M:\Proyecto base de datos2\archive"
CSV_FILES = [
    os.path.join(ARCHIVE_DIR, "2019-Oct.csv"),
    os.path.join(ARCHIVE_DIR, "2019-Nov.csv"),
    os.path.join(ARCHIVE_DIR, "2020-Apr.csv")
]

def obtener_estadisticas_db(db):
    """Retorna las estadísticas clave de volumen de la base de datos en GB."""
    stats = db.command("dbstats", scale=1024 * 1024 * 1024)
    data_size_gb = stats.get("dataSize", 0)
    storage_size_gb = stats.get("storageSize", 0)
    index_size_gb = stats.get("indexSize", 0)
    return data_size_gb, storage_size_gb, index_size_gb

def procesar_chunk(df_chunk):
    """
    Sanea y convierte los tipos de datos de un DataFrame para su inserción en MongoDB.
    """
    # 1. Conversión de fecha a datetime de Python (ISODate en MongoDB)
    df_chunk['event_time'] = pd.to_datetime(df_chunk['event_time'], errors='coerce')

    # 2. Manejo de valores numéricos
    df_chunk['price'] = pd.to_numeric(df_chunk['price'], errors='coerce').fillna(0.0).astype(float)
    df_chunk['product_id'] = pd.to_numeric(df_chunk['product_id'], errors='coerce').fillna(0).astype('int64')
    df_chunk['category_id'] = pd.to_numeric(df_chunk['category_id'], errors='coerce').fillna(0).astype('int64')
    df_chunk['user_id'] = pd.to_numeric(df_chunk['user_id'], errors='coerce').fillna(0).astype('int64')

    # 3. Manejo de cadenas de texto y valores nulos
    df_chunk['event_type'] = df_chunk['event_type'].fillna('view').astype(str)
    df_chunk['category_code'] = df_chunk['category_code'].fillna('').astype(str)
    df_chunk['brand'] = df_chunk['brand'].fillna('').astype(str)
    df_chunk['user_session'] = df_chunk['user_session'].fillna('').astype(str)

    # Convertir a lista de diccionarios para pymongo
    docs = df_chunk.to_dict(orient='records')
    return docs

def importar_dataset():
    print("=" * 80)
    print("INICIANDO PROCESO DE INGESTA MASIVA EN MONGODB")
    print(f"URI: {MONGO_URI}")
    print(f"Base de datos: {DB_NAME} | Colección: {COLLECTION_NAME}")
    print(f"Tamaño de bloque (chunksize): {CHUNK_SIZE:,} filas")
    print("=" * 80)

    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Verificar conexión
        client.admin.command('ping')
        db = client[DB_NAME]
        col = db[COLLECTION_NAME]
        print("[OK] Conexión establecida exitosamente con el Replica Set de MongoDB.\n")
    except Exception as e:
        print(f"[ERROR] No se pudo conectar a MongoDB: {e}")
        sys.exit(1)

    total_insertados = col.estimated_document_count()
    data_gb, storage_gb, idx_gb = obtener_estadisticas_db(db)
    print(f"Estado inicial de la colección '{COLLECTION_NAME}':")
    print(f" - Documentos existentes: {total_insertados:,}")
    print(f" - dataSize actual: {data_gb:.2f} GB (Meta obligatoria: >= 20.0 GB)")
    print(f" - storageSize en disco: {storage_gb:.2f} GB\n")

    inicio_global = time.time()

    for csv_path in CSV_FILES:
        if not os.path.exists(csv_path):
            print(f"[ALERTA] Archivo no encontrado: {csv_path}. Saltando...")
            continue

        file_size_mb = os.path.getsize(csv_path) / (1024 * 1024)
        print("-" * 80)
        print(f"Procesando: {os.path.basename(csv_path)} ({file_size_mb:.2f} MB)")
        print("-" * 80)

        chunk_num = 0
        inicio_archivo = time.time()

        for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE, low_memory=False):
            chunk_num += 1
            t0 = time.time()
            docs = procesar_chunk(chunk)
            
            try:
                col.insert_many(docs, ordered=False)
            except Exception as e:
                # En inserción desordenada, capturamos excepciones si hay duplicados menores
                pass

            total_insertados += len(docs)
            t_chunk = time.time() - t0
            velocidad = len(docs) / t_chunk if t_chunk > 0 else 0

            if chunk_num % 10 == 0:
                data_gb, storage_gb, _ = obtener_estadisticas_db(db)
                print(f" Chunk #{chunk_num:04d} | Total docs: {total_insertados:,} | "
                      f"dataSize: {data_gb:.2f} GB / 20.0 GB | "
                      f"storage: {storage_gb:.2f} GB | {velocidad:,.0f} docs/seg")

                # Si ya superamos con margen la meta de 20 GB, notificamos
                if data_gb >= 20.5:
                    print("\n" + "=" * 80)
                    print(f"¡META DE VOLUMEN ALCANZADA CON ÉXITO! dataSize: {data_gb:.2f} GB (>= 20.0 GB)")
                    print("=" * 80)

        tiempo_archivo = time.time() - inicio_archivo
        print(f"\n[COMPLETADO] {os.path.basename(csv_path)} procesado en {tiempo_archivo/60:.2f} minutos.")

    tiempo_total = time.time() - inicio_global
    data_gb, storage_gb, idx_gb = obtener_estadisticas_db(db)
    print("\n" + "=" * 80)
    print("RESUMEN FINAL DE LA INGESTA")
    print("=" * 80)
    print(f"Documentos totales en colección: {col.estimated_document_count():,}")
    print(f"Volumen lógico (dataSize):      {data_gb:.2f} GB")
    print(f"Volumen en disco (storageSize):   {storage_gb:.2f} GB")
    print(f"Tiempo total de ejecución:        {tiempo_total/60:.2f} minutos")
    print("=" * 80)

if __name__ == "__main__":
    importar_dataset()
