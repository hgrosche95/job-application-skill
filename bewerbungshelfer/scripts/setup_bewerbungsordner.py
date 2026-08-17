#!/usr/bin/env python3
"""Legt Bewerbungen/<Firma>-<Datum>/ an, kopiert Lebenslauf/Portfolio hinein und optional
weitere Unterlagen (Zeugnisse, Zertifikate) in einen Anlagen/-Unterordner."""

import argparse
import re
import shutil
import sys
from datetime import date
from pathlib import Path


def slugify(name: str) -> str:
    name = name.strip()
    name = re.sub(r'[\\/:*?"<>|]', "", name)
    name = re.sub(r"\s+", "-", name)
    return name or "Firma"


def kopiere(dateien, zielordner: Path) -> None:
    zielordner.mkdir(parents=True, exist_ok=True)
    for quelle in dateien:
        quelle_pfad = Path(quelle)
        if not quelle_pfad.is_file():
            print(f"Warnung: Datei nicht gefunden, wird übersprungen: {quelle_pfad}", file=sys.stderr)
            continue
        shutil.copy2(quelle_pfad, zielordner / quelle_pfad.name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--firma", required=True, help="Firmenname für den Ordnernamen")
    parser.add_argument("--datum", default=date.today().isoformat(), help="Datum YYYY-MM-DD (Standard: heute)")
    parser.add_argument("--basis", default="Bewerbungen", help="Basisordner für den Bewerbungsordner")
    parser.add_argument("--lebenslauf", nargs="*", default=[], help="Pfad(e) zu Dateien, die direkt in den Bewerbungsordner kopiert werden")
    parser.add_argument("--anlagen", nargs="*", default=[], help="Pfad(e) zu weiteren Unterlagen (Zeugnisse, Zertifikate), die in einen Anlagen/-Unterordner kopiert werden")
    args = parser.parse_args()

    ordner = Path(args.basis) / f"{slugify(args.firma)}-{args.datum}"
    kopiere(args.lebenslauf, ordner)
    if args.anlagen:
        kopiere(args.anlagen, ordner / "Anlagen")

    print(ordner.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
