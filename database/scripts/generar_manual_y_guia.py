"""Generate the printable project manual from the maintained text guide."""

import textwrap
from pathlib import Path

import pymupdf

MANUAL = Path(__file__).resolve().parents[2] / "docs" / "MANUAL_Y_GUIA_DE_EXPOSICION.txt"
PDF = MANUAL.with_suffix(".pdf")


def main() -> None:
    document = pymupdf.open()
    page = document.new_page()
    y = 52
    for line in MANUAL.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            y += 7
            continue
        is_heading = line.isupper() and len(line) < 100
        font_size = 12 if is_heading else 9
        wrapped = textwrap.wrap(line, width=92) or [""]
        for part in wrapped:
            if y > 780:
                page = document.new_page()
                y = 52
            page.insert_text((48, y), part, fontsize=font_size, fontname="helv")
            y += 17 if is_heading else 13
    document.set_metadata({"title": "NYC Taxi Analytics - Manual de ejecución y sustentación"})
    document.save(PDF, garbage=4, deflate=True)
    print(f"Manual generado: {PDF} ({len(document)} páginas)")


if __name__ == "__main__":
    main()
