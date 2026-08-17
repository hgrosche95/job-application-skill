#!/usr/bin/env python3
"""Rendert den bestätigten Anschreiben-Text als sauber formatiertes .pdf."""

import argparse
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

TEXT_STYLE = ParagraphStyle("Anschreiben", fontName="Helvetica", fontSize=11, leading=16, spaceAfter=12)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", required=True, help="Pfad zu einer Textdatei mit dem bestätigten Anschreiben")
    parser.add_argument("--ausgabe", required=True, help="Pfad der zu erzeugenden .pdf-Datei")
    args = parser.parse_args()

    inhalt = Path(args.text).read_text(encoding="utf-8").strip()
    if not inhalt:
        print("Fehler: Anschreiben-Textdatei ist leer.", file=sys.stderr)
        return 1

    ausgabe = Path(args.ausgabe)
    ausgabe.parent.mkdir(parents=True, exist_ok=True)

    rand = 2.5 * cm
    doc = SimpleDocTemplate(
        str(ausgabe),
        pagesize=A4,
        leftMargin=rand,
        rightMargin=rand,
        topMargin=rand,
        bottomMargin=rand,
    )

    story = []
    for absatz in inhalt.split("\n\n"):
        absatz = absatz.strip()
        if absatz:
            story.append(Paragraph(absatz.replace("\n", "<br/>"), TEXT_STYLE))
    doc.build(story)

    print(ausgabe.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
