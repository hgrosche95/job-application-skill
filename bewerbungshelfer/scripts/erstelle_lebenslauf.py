#!/usr/bin/env python3
"""Erstellt einen gestalteten Lebenslauf (.pdf) aus strukturierten Profildaten (JSON)."""

import argparse
import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

FOTO_BREITE = 2.8 * cm
FOTO_HOEHE = 3.4 * cm
FOTO_ABSTAND = 0.6 * cm

ACCENT = colors.HexColor("#1F3B4D")
TEXT = colors.HexColor("#222222")
MUTED = colors.HexColor("#5A5A5A")
ON_ACCENT = colors.white
ON_ACCENT_MUTED = colors.HexColor("#D8E3E8")

NAME_STYLE = ParagraphStyle("Name", fontName="Helvetica-Bold", fontSize=22, textColor=ON_ACCENT, leading=26)
ROLLE_STYLE = ParagraphStyle("Rolle", fontName="Helvetica", fontSize=13, textColor=ON_ACCENT_MUTED, leading=16, spaceBefore=2)
KONTAKT_STYLE = ParagraphStyle("Kontakt", fontName="Helvetica", fontSize=9.5, textColor=ON_ACCENT_MUTED, leading=12, spaceBefore=6)
SECTION_STYLE = ParagraphStyle("Section", fontName="Helvetica-Bold", fontSize=12, textColor=ACCENT, spaceBefore=14, spaceAfter=2)
ZUSAMMENFASSUNG_STYLE = ParagraphStyle("Zusammenfassung", fontName="Helvetica-Oblique", fontSize=10.5, textColor=TEXT, leading=14)
TITEL_STYLE = ParagraphStyle("Titel", fontName="Helvetica-Bold", fontSize=11, textColor=TEXT, spaceBefore=6)
NEBENZEILE_STYLE = ParagraphStyle("Nebenzeile", fontName="Helvetica-Oblique", fontSize=10, textColor=MUTED, spaceAfter=2)
BULLET_STYLE = ParagraphStyle("Bullet", fontName="Helvetica", fontSize=10, textColor=TEXT, leftIndent=14, bulletIndent=2, spaceAfter=1)
SKILLS_STYLE = ParagraphStyle("Skills", fontName="Helvetica", fontSize=10.5, textColor=TEXT)


def section_heading(story, text):
    story.append(Paragraph(text.upper(), SECTION_STYLE))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=4))


def add_entry(story, titel, nebenzeile, punkte):
    story.append(Paragraph(titel, TITEL_STYLE))
    if nebenzeile:
        story.append(Paragraph(nebenzeile, NEBENZEILE_STYLE))
    for punkt in punkte or []:
        story.append(Paragraph(f"•  {punkt}", BULLET_STYLE))


def sized_image(pfad, max_breite, max_hoehe):
    iw, ih = ImageReader(pfad).getSize()
    skala = min(max_breite / iw, max_hoehe / ih)
    return Image(pfad, width=iw * skala, height=ih * skala)


def build_header(story, profil, breite):
    zeilen = [Paragraph(profil["name"], NAME_STYLE)]
    if profil.get("rolle"):
        zeilen.append(Paragraph(profil["rolle"], ROLLE_STYLE))
    kontakt_teile = [profil.get(k) for k in ("email", "telefon", "ort", "github", "linkedin", "portfolio") if profil.get(k)]
    if kontakt_teile:
        zeilen.append(Paragraph("  |  ".join(kontakt_teile), KONTAKT_STYLE))

    foto_pfad = profil.get("foto")
    if foto_pfad and Path(foto_pfad).is_file():
        foto = sized_image(foto_pfad, FOTO_BREITE, FOTO_HOEHE)
        text_breite = breite - FOTO_BREITE - FOTO_ABSTAND
        zeile = [zeilen, foto]
        spalten = [text_breite, FOTO_BREITE + FOTO_ABSTAND]
    elif foto_pfad:
        print(f"Warnung: Foto nicht gefunden, wird übersprungen: {foto_pfad}", file=sys.stderr)
        zeile = [zeilen]
        spalten = [breite]
    else:
        zeile = [zeilen]
        spalten = [breite]

    tabelle = Table([zeile], colWidths=spalten)
    tabelle.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    story.append(tabelle)
    story.append(Spacer(1, 14))


def build_story(profil: dict, breite) -> list:
    story = []
    build_header(story, profil, breite)

    if profil.get("zusammenfassung"):
        story.append(Paragraph(profil["zusammenfassung"], ZUSAMMENFASSUNG_STYLE))

    if profil.get("erfahrung"):
        section_heading(story, "Berufserfahrung")
        for e in profil["erfahrung"]:
            titel = " – ".join(t for t in (e.get("rolle"), e.get("firma")) if t)
            add_entry(story, titel, e.get("zeitraum", ""), e.get("punkte"))

    if profil.get("ausbildung"):
        section_heading(story, "Ausbildung")
        for a in profil["ausbildung"]:
            titel = " – ".join(t for t in (a.get("abschluss"), a.get("institution")) if t)
            add_entry(story, titel, a.get("zeitraum", ""), a.get("punkte"))

    if profil.get("projekte"):
        section_heading(story, "Projekte")
        for pr in profil["projekte"]:
            add_entry(story, pr.get("titel", ""), pr.get("info", ""), pr.get("punkte"))

    if profil.get("skills"):
        section_heading(story, "Skills")
        story.append(Paragraph(", ".join(profil["skills"]), SKILLS_STYLE))

    return story


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--daten", required=True, help="Pfad zu einer JSON-Datei mit den Profildaten (siehe resources/lebenslauf_interview.md)")
    parser.add_argument("--ausgabe", required=True, help="Pfad der zu erzeugenden .pdf-Datei")
    args = parser.parse_args()

    profil = json.loads(Path(args.daten).read_text(encoding="utf-8"))
    if not profil.get("name"):
        print("Fehler: 'name' fehlt in den Profildaten.", file=sys.stderr)
        return 1

    ausgabe = Path(args.ausgabe)
    ausgabe.parent.mkdir(parents=True, exist_ok=True)

    rand = 1.5 * cm
    doc = SimpleDocTemplate(
        str(ausgabe),
        pagesize=A4,
        leftMargin=rand,
        rightMargin=rand,
        topMargin=rand,
        bottomMargin=rand,
    )
    breite = A4[0] - 2 * rand
    doc.build(build_story(profil, breite))

    print(ausgabe.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
