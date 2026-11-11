"""Download public NYC TLC yellow-taxi trip Parquet files for January-August 2019."""

from __future__ import annotations

import concurrent.futures
import os
import sys
import urllib.request
from pathlib import Path

BASE_URL = "https://d37ci6vzurychx.cloudfront.net"
DATA_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "parcial-bd" / "tlc_yellow"
WORKERS = 4


def download(url: str, destination: Path) -> tuple[str, int]:
    partial = destination.with_suffix(destination.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": "ParcialBD-TLC-data-loader/1.0"})

    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status != 200:
                    raise OSError(f"HTTP {response.status} for {url}")
                with partial.open("wb") as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
            partial.replace(destination)
            return destination.name, destination.stat().st_size
        except Exception:
            if partial.exists():
                partial.unlink()
            if attempt == 3:
                raise

    raise RuntimeError(f"Unable to download {url}")


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    downloads: list[tuple[str, Path]] = [
        (
            f"{BASE_URL}/trip-data/yellow_tripdata_{year}-{month:02d}.parquet",
            DATA_DIR / f"yellow_tripdata_{year}-{month:02d}.parquet",
        )
        for year in (2019,)
        for month in range(1, 9)
    ]
    downloads.append((f"{BASE_URL}/misc/taxi_zone_lookup.csv", DATA_DIR / "taxi_zone_lookup.csv"))

    total_bytes = sum(path.stat().st_size for _, path in downloads if path.exists())
    pending = [(url, path) for url, path in downloads if not path.exists()]
    print(f"Fuente: NYC Taxi & Limousine Commission (TLC)")
    print(f"Destino: {DATA_DIR}")
    print(f"Archivos: {len(downloads) - len(pending)}/{len(downloads)} ya descargados")

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
            futures = {executor.submit(download, url, path): path for url, path in pending}
            for future in concurrent.futures.as_completed(futures):
                name, size = future.result()
                total_bytes += size
                print(f"[OK] {name}: {size / 1024 / 1024:.1f} MiB ({total_bytes / 1024**3:.2f} GiB total)")
    except Exception as error:
        print(f"[ERROR] Descarga incompleta: {error}", file=sys.stderr)
        return 1

    print(f"[OK] Descarga completa: {total_bytes / 1024**3:.2f} GiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
