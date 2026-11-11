"""Stream TLC Parquet files into MongoDB without loading the dataset into RAM."""

from __future__ import annotations

import concurrent.futures
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import pyarrow.parquet as parquet
from pymongo import MongoClient
from pymongo.errors import BulkWriteError

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0")
DB_NAME = os.getenv("DB_NAME", "nyc_taxi_analytics")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "yellow_trips")
DATA_DIR = Path(os.getenv(
    "TLC_DATA_DIR",
    Path(os.getenv("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "parcial-bd" / "tlc_yellow",
))
BATCH_SIZE = int(os.getenv("TLC_BATCH_SIZE", "20000"))
IMPORT_FILES = [
    f"yellow_tripdata_2019-{month:02d}.parquet"
    for month in range(1, 9)
]

FIELD_ALIASES = {
    "vendorid": "vendor_id",
    "tpeppickupdatetime": "pickup_datetime",
    "tpepdropoffdatetime": "dropoff_datetime",
    "passengercount": "passenger_count",
    "tripdistance": "trip_distance",
    "ratecodeid": "rate_code_id",
    "storeandfwdflag": "store_and_fwd_flag",
    "pulocationid": "pickup_location_id",
    "dolocationid": "dropoff_location_id",
    "paymenttype": "payment_type",
    "fareamount": "fare_amount",
    "extra": "extra",
    "mtatax": "mta_tax",
    "tipamount": "tip_amount",
    "tollsamount": "tolls_amount",
    "improvementsurcharge": "improvement_surcharge",
    "totalamount": "total_amount",
    "congestionsurcharge": "congestion_surcharge",
    "airportfee": "airport_fee",
}


def normalize_row(
    row: dict[str, Any],
    source_file: str,
    row_number: int,
    field_targets: list[tuple[str, str]],
) -> dict[str, Any]:
    document: dict[str, Any] = {"_id": f"{source_file}:{row_number}", "source_file": source_file}
    for field, target in field_targets:
        value = row[field]
        if value is None:
            continue
        document[target] = value
    return document


def insert_batch(collection: Any, documents: list[dict[str, Any]]) -> tuple[int, int]:
    try:
        result = collection.insert_many(documents, ordered=False)
        return len(result.inserted_ids), 0
    except BulkWriteError as error:
        write_errors = error.details.get("writeErrors", [])
        non_duplicate_errors = [item for item in write_errors if item.get("code") != 11000]
        if non_duplicate_errors:
            raise RuntimeError(f"MongoDB rechazó documentos: {non_duplicate_errors[:3]}") from error
        return error.details.get("nInserted", 0), len(write_errors)


def import_zone_lookup(database: Any) -> None:
    lookup_file = DATA_DIR / "taxi_zone_lookup.csv"
    if not lookup_file.exists():
        raise FileNotFoundError(f"No se encontró el catálogo de zonas: {lookup_file}")

    import csv

    zones = database["taxi_zones"]
    if zones.estimated_document_count() > 0:
        return
    with lookup_file.open(encoding="utf-8-sig", newline="") as source:
        documents = [
            {
                "_id": int(row["LocationID"]),
                "borough": row["Borough"],
                "zone": row["Zone"],
                "service_zone": row["service_zone"],
            }
            for row in csv.DictReader(source)
        ]
    if documents:
        zones.insert_many(documents, ordered=False)
    print(f"[OK] Catálogo de zonas cargado: {len(documents)}")


def import_file(collection: Any, path: Path, database: Any) -> int:
    file_name = path.name
    completed_file = database["imported_files"].find_one({"_id": file_name})
    if completed_file:
        print(f"[SKIP] Archivo ya importado: {file_name}", flush=True)
        return completed_file["rows"]

    parquet_file = parquet.ParquetFile(path)
    total_rows = parquet_file.metadata.num_rows
    resume_offset = collection.count_documents({
        "_id": {"$regex": f"^{re.escape(file_name)}:"}
    })
    if resume_offset >= total_rows:
        database["imported_files"].insert_one(
            {"_id": file_name, "rows": total_rows, "inserted": 0, "duplicates": total_rows}
        )
        print(f"[OK] {file_name}: ya estaban presentes las {total_rows:,} filas", flush=True)
        return total_rows

    field_targets = [
        (field, FIELD_ALIASES[normalized])
        for field in parquet_file.schema.names
        if (normalized := "".join(character.lower() for character in field if character.isalnum()))
        in FIELD_ALIASES
    ]
    inserted = 0
    duplicates = 0
    started = time.monotonic()
    row_offset = 0
    batch_number = 0

    for batch in parquet_file.iter_batches(batch_size=BATCH_SIZE, use_threads=True):
        batch_start = row_offset
        row_offset += batch.num_rows
        if row_offset <= resume_offset:
            continue
        rows = batch.to_pylist()
        row_start = batch_start
        if batch_start < resume_offset:
            skipped_rows = resume_offset - batch_start
            rows = rows[skipped_rows:]
            row_start += skipped_rows
        documents = [
            normalize_row(row, file_name, row_start + index, field_targets)
            for index, row in enumerate(rows)
        ]
        batch_inserted, batch_duplicates = insert_batch(collection, documents)
        inserted += batch_inserted
        duplicates += batch_duplicates
        batch_number += 1

        if batch_number % 100 == 0:
            elapsed = max(time.monotonic() - started, 0.001)
            processed_rows = row_offset - resume_offset
            rate = processed_rows / elapsed
            print(
                f"[PROGRESO] {file_name}: {processed_rows:,}/"
                f"{total_rows - resume_offset:,} filas nuevas; "
                f"{rate:,.0f} filas/s; {inserted:,} nuevas; {duplicates:,} repetidas",
                flush=True,
            )

    database["imported_files"].insert_one(
        {"_id": file_name, "rows": total_rows, "inserted": inserted, "duplicates": duplicates}
    )
    elapsed = time.monotonic() - started
    print(
        f"[OK] {file_name}: {total_rows:,} filas, {inserted:,} insertadas, "
        f"{duplicates:,} repetidas en {elapsed / 60:.1f} min",
        flush=True,
    )
    return total_rows


def import_file_worker(path: Path) -> int:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    try:
        database = client[DB_NAME]
        return import_file(database[COLLECTION_NAME], path, database)
    finally:
        client.close()


def main() -> int:
    paths = [DATA_DIR / file_name for file_name in IMPORT_FILES]
    missing = [path.name for path in paths if not path.exists()]
    if missing:
        print(
            f"Faltan archivos en {DATA_DIR}: {', '.join(missing)}. "
            "Ejecute primero descargar_dataset_tlc.py.",
            file=sys.stderr,
        )
        return 1
    if BATCH_SIZE < 1000 or BATCH_SIZE > 50000:
        print("TLC_BATCH_SIZE debe estar entre 1000 y 50000.", file=sys.stderr)
        return 1

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    try:
        client.admin.command("ping")
        status = client.admin.command("replSetGetStatus")
        if not status.get("ok"):
            raise RuntimeError("MongoDB no está ejecutándose como Replica Set.")

        database = client[DB_NAME]
        collection = database[COLLECTION_NAME]
        import_zone_lookup(database)
        print(
            f"Importando {len(paths)} archivos oficiales TLC a "
            f"{DB_NAME}.{COLLECTION_NAME}; lote={BATCH_SIZE:,}"
        )

        with concurrent.futures.ProcessPoolExecutor(max_workers=3) as executor:
            total_rows = sum(executor.map(
                import_file_worker,
                paths,
            ))

        stats = database.command({"dbStats": 1, "scale": 1024**3})
        print(
            f"[RESUMEN] Filas procesadas: {total_rows:,}; "
            f"documentos: {collection.estimated_document_count():,}; "
            f"dataSize: {stats['dataSize']:.2f} GiB; storageSize: {stats['storageSize']:.2f} GiB"
        )
        if stats["dataSize"] < 20:
            print("[AVISO] La meta de 20 GiB aún no se alcanza. Descargue más años de datos TLC.")
        return 0
    except Exception as error:
        print(f"[ERROR] Importación fallida: {error}", file=sys.stderr)
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
