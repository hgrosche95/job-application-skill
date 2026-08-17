# Datenformat & Feldliste für den Lebenslauf-Generator

## Felder
Diese Liste dient zweifach: als Checkliste beim Extrahieren aus Freitext (welche Felder fehlen
noch?) und als Fragenkatalog, falls direkt nachgefragt wird. Nur nach Daten fragen, nicht
auffüllen oder erfinden — leere Angaben im JSON einfach weglassen statt zu raten.

1. Name und aktuelle/angestrebte Rolle (kurzer Titel, z. B. "Backend-Entwickler")?
2. Kontakt: E-Mail, Ort, optional Telefon, GitHub/LinkedIn/Portfolio-Link?
3. Kurzprofil in 1–2 Sätzen (optional, kann übersprungen werden)?
4. Berufserfahrung: pro Station Rolle, Firma, Zeitraum, 2–4 Stichpunkte zu Verantwortung/Ergebnissen
   (Zahlen einbauen, wo vorhanden)?
5. Ausbildung: pro Station Abschluss, Institution, Zeitraum, optional Stichpunkte?
6. Projekte (optional): Titel, kurze Info zu Rolle/Technologien, optional Stichpunkte?
7. Skills: Stichwortliste (Sprachen, Tools, Frameworks)?
8. Foto: optionaler lokaler Bildpfad — nur einbinden, wenn der Nutzer ausdrücklich ein Foto
   angibt, nie eines annehmen oder erfinden.

## JSON-Format für `scripts/erstelle_lebenslauf.py`

```json
{
  "name": "Max Mustermann",
  "rolle": "Backend-Entwickler",
  "email": "max@example.com",
  "ort": "Berlin",
  "github": "github.com/maxmustermann",
  "foto": "",
  "zusammenfassung": "Backend-Entwickler mit Fokus auf skalierbare Python-APIs.",
  "erfahrung": [
    {
      "rolle": "Backend-Entwickler",
      "firma": "WebWerk GmbH",
      "zeitraum": "2022–heute",
      "punkte": [
        "Django-API für 50k tägliche Nutzer:innen mitgebaut",
        "Antwortzeiten durch Caching-Layer um 40% gesenkt"
      ]
    }
  ],
  "ausbildung": [
    { "abschluss": "B.Sc. Informatik", "institution": "TU Berlin", "zeitraum": "2017–2020" }
  ],
  "projekte": [
    {
      "titel": "job-application-skill",
      "info": "Claude Agent Skill, Python",
      "punkte": ["Bewerbungsworkflow automatisiert"]
    }
  ],
  "skills": ["Python", "Django", "PostgreSQL", "Docker"]
}
```

Nur `name` ist Pflicht — alle anderen Felder sind optional und werden im Dokument ausgelassen,
wenn sie fehlen. `foto` bleibt leer, solange der Nutzer nicht ausdrücklich einen Bildpfad nennt.
