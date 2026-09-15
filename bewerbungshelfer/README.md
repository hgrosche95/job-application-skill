# Bewerbungshelfer

Claude Agent Skill, der beim Erstellen von Bewerbungsunterlagen hilft: liest Lebenslauf und
Stellenanzeige, entwirft im Dialog ein individuelles Anschreiben und legt nach Bestätigung
einen fertigen Bewerbungsordner an. Läuft als Skill vollständig innerhalb der Claude-Session
des jeweiligen Nutzers — keine fest einprogrammierten persönlichen Daten, keine gespeicherten
API-Keys.

Dieselben drei Python-Scripts (`scripts/`) werden mittlerweile auch von `apps/api` aufgerufen,
das die Kernfähigkeiten zusätzlich als REST-API und MCP-Server bereitstellt (nutzbar aus Claude
Desktop, n8n oder anderen Clients) — siehe [`../apps/api`](../apps/api). Dieser Skill-Ordner
selbst bleibt davon unberührt und funktioniert weiterhin eigenständig.

## Installation
1. Diesen Ordner (`bewerbungshelfer/`) nach `.claude/skills/bewerbungshelfer/` (projektweit)
   oder `~/.claude/skills/bewerbungshelfer/` (nutzerweit) kopieren.
2. In Claude Code / Cowork wird der Skill automatisch erkannt, sobald der Nutzer eine
   Stellenanzeige teilt oder um Hilfe bei einer Bewerbung bittet.

## Umfang (MVP)
- Nutzer liefert Lebenslauf-Datei(en)/Portfolio und eine Stellenanzeige (Text oder URL) — oder
  beschreibt sich frei in eigenen Worten, woraus bei Bedarf ein neuer, gestalteter Lebenslauf
  (`.pdf`) erstellt wird.
- Skill entwirft ein Anschreiben, überarbeitet es nach Feedback und legt es nach Bestätigung als
  `.pdf` zusammen mit dem Lebenslauf in `Bewerbungen/<Firma>-<Datum>/` ab.

## Geplante Ausbaustufen
- GitHub-Profil/Repos automatisch einlesen und passende Projekte für das Anschreiben vorschlagen.
- Aktive Stellensuche im Web anhand von Profil und Wünschen des Nutzers.

## Voraussetzungen
- Python 3.
- `pip install -r requirements.txt` (reportlab) für die PDF-Erzeugung von Lebenslauf und
  Anschreiben.
