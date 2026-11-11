"""Insert sample trips into the local TLC database to demonstrate Change Streams."""

import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0")
DB_NAME = os.getenv("DB_NAME", "nyc_taxi_analytics")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "yellow_trips")

LOCATION_IDS = [4, 12, 13, 48, 79, 87, 107, 114, 125, 132, 138, 140, 141, 161, 162, 163, 164, 170, 186, 209, 211, 231, 236, 237, 238, 239, 249, 262, 264]


def main() -> None:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    try:
        client.admin.command("ping")
        status = client.admin.command("replSetGetStatus")
        if not status.get("ok"):
            raise RuntimeError("MongoDB debe ejecutarse como Replica Set para usar Change Streams.")
        collection = client[DB_NAME][COLLECTION_NAME]
        print(f"Insertando viajes de demostración en {DB_NAME}.{COLLECTION_NAME}; Ctrl+C para terminar.")

        counter = 0
        while True:
            pickup = datetime.now(timezone.utc)
            dropoff = pickup + timedelta(minutes=random.randint(4, 45))
            distance = round(random.uniform(0.5, 15), 2)
            fare = round(3.75 + distance * random.uniform(2.2, 4.1), 2)
            tip = round(fare * random.uniform(0, 0.3), 2)
            total = round(fare + tip + random.uniform(1, 8), 2)
            pickup_id, dropoff_id = random.sample(LOCATION_IDS, 2)
            document = {
                "pickup_datetime": pickup,
                "dropoff_datetime": dropoff,
                "passenger_count": random.randint(1, 4),
                "trip_distance": distance,
                "pickup_location_id": pickup_id,
                "dropoff_location_id": dropoff_id,
                "payment_type": random.choice([1, 1, 1, 2, 2, 3]),
                "fare_amount": fare,
                "tip_amount": tip,
                "total_amount": total,
                "demo": True
            }
            collection.insert_one(document)
            counter += 1
            print(
                f"[{pickup:%H:%M:%S}] viaje #{counter}: "
                f"{pickup_id} → {dropoff_id}, {distance} mi, ${total:.2f}"
            )
            time.sleep(random.uniform(1.5, 3))
    except KeyboardInterrupt:
        print("\nSimulación detenida.")
    except Exception as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        raise
    finally:
        client.close()


if __name__ == "__main__":
    main()
