---
name: bewerbungshelfer
description: Erstellt Bewerbungsunterlagen — einen individuellen Anschreiben-Entwurf aus Lebenslauf und Stellenanzeige, bei Bedarf per Interview auch einen neu gestalteten Lebenslauf — und legt alles in einem Bewerbungsordner ab. Nutzen wenn der Nutzer sich auf eine Stelle bewerben will, ein Anschreiben oder Motivationsschreiben braucht, eine Stellenanzeige (Text oder Link) zusammen mit seinem Lebenslauf teilt, oder einen neuen Lebenslauf erstellen lassen möchte.
---

# Bewerbungshelfer

Bei jedem `python ...`-Aufruf in diesem Skill (Schritt 2 und 7): Schlägt er mit
"nicht gefunden"/"not recognized" fehl, zuerst `py` statt `python` probieren. Scheitert auch
das, wurde Python vermutlich gerade erst installiert und die laufende Sitzung hat den
aktualisierten PATH noch nicht übernommen — den Nutzer bitten, Claude Code komplett neu zu
starten (ein neues Terminal im selben Fenster reicht nicht).

## Ablauf

### 1. Status abfragen
Als Allererstes fragen: "
Hallo, ich bin dein persönlicher Bewerbungshelfer. Ich kann dir helfen, einen Lebenslauf und ein individuelles Anschreiben zu erstellen und deine Bewerbungsunterlagen in einem sauberen Ordner zusammenzustellen.
Hast du schon eine Stellenanzeige und einen
Lebenslauf? Falls du schon einen Lebenslauf hast, kannst du mir Zugriff auf das Dokument geben oder es einfach hier hochladen. Für die Stellenanzeige gilt: Text einfügen oder einen Link teilen." Danach je nach Antwort verzweigen:
- Beides vorhanden → weiter mit Schritt 3.
- Lebenslauf fehlt → Schritt 2 durchlaufen, danach weiter mit Schritt 3.
- Stellenanzeige fehlt → Nutzer bitten, den Text einzufügen oder einen Link zu teilen. Dieser
  Skill kann sich keine Anzeige ausdenken oder danach suchen; ohne Anzeige nicht fortfahren.

### 2. Lebenslauf erstellen (nur falls in Schritt 1 als fehlend genannt)
- Nutzer bitten, in eigenen Worten frei über sich zu schreiben (Werdegang, Erfahrungen,
  Ausbildung, Skills) — kein starres Frage-für-Frage-Interview nötig.
- Aktiv nach einem Foto fragen: "Möchtest du ein Foto einfügen? Falls ja, nenn mir den lokalen
  Dateipfad." Nicht nur beiläufig erwähnen — diese Frage immer explizit stellen, auch wenn im
  Freitext nichts dazu stand.
- Aus Freitext und Foto-Antwort die Felder gemäß `resources/lebenslauf_interview.md`
  extrahieren und ins dort gezeigte JSON-Format bringen. Nur bei weiteren fehlenden oder
  unklaren Angaben gezielt nachfragen, statt den ganzen Fragenkatalog der Reihe nach
  abzuarbeiten.
- Antworten/Extrahiertes als JSON in eine Datei schreiben (z. B. `lebenslauf_daten.json`).
- `scripts/erstelle_lebenslauf.py` ausführen, um daraus ein gestaltetes `.pdf` zu erzeugen:
  ```
  python scripts/erstelle_lebenslauf.py --daten "<pfad>/lebenslauf_daten.json" --ausgabe "<pfad>/Lebenslauf.pdf"
  ```
- Ergebnis-Pfad nennen und nach Feedback fragen; bei Änderungswünschen die JSON-Datei anpassen
  und das Skript erneut ausführen.
- Abgeschlossen, wenn der Nutzer das erzeugte `.pdf` ausdrücklich bestätigt. Ab hier ist dieses
  Dokument der Lebenslauf für Schritt 3.

### 3. Unterlagen einsammeln
- Lebenslauf: aus Schritt 2 übernehmen, oder den vom Nutzer genannten Pfad zu einem vorhandenen
  Lebenslauf (und ggf. Portfolio) einlesen.
- Bei einer Stellenanzeige als URL: Seite abrufen und den Anzeigentext extrahieren.
- Abgeschlossen, wenn dir Lebenslauf-Inhalt und Anzeigentext vollständig als Text vorliegen.

### 4. Anzeige und Profil abgleichen
- Extrahiere Firma, Stellentitel und die 3–5 wichtigsten Anforderungen aus der Anzeige.
- Ordne jeder Anforderung eine passende Erfahrung oder ein Projekt aus dem Lebenslauf zu; wo nichts passt, notiere die Lücke statt sie zu erfinden.
- Dieses Ergebnis dem Nutzer als kurzes Feedback zeigen, bevor der Anschreiben-Entwurf folgt:
  welche Anforderungen gut abgedeckt sind und welche Lücken erkennbar sind (fehlende
  Erfahrung, unklare Angaben). Ehrlich benennen, nicht schönreden.
- Abgeschlossen, wenn Firma, Stellentitel und mindestens 2–3 konkrete Anknüpfungspunkte feststehen und der Nutzer das Feedback gesehen hat.

### 5. Anschreiben-Entwurf erstellen
- Struktur- und Stilvorgaben: `resources/anschreiben_vorlage.md`.
- Anknüpfungspunkte aus Schritt 4 konkret einbauen, keine austauschbaren Floskeln.
- Entwurf direkt im Chat zeigen, noch nicht als Datei speichern.

### 6. Feedback-Runde
- Aktiv nach Feedback fragen und überarbeiten, bis der Nutzer den Entwurf ausdrücklich als final bestätigt (z. B. "passt so", "final", "kannst du so abspeichern").
- Erst nach dieser ausdrücklichen Bestätigung zu Schritt 7 übergehen.

### 7. Bewerbungsordner anlegen
- Firmenname (aus Schritt 4) und heutiges Datum bestimmen.
- Fragen, ob weitere Dokumente (z. B. Zeugnisse, Zertifikate) mit in den Ordner sollen; falls
  ja, deren Pfade erfragen.
- `scripts/setup_bewerbungsordner.py` ausführen, um `Bewerbungen/<Firma>-<Datum>/` anzulegen,
  Lebenslauf/Portfolio hineinzukopieren und etwaige weitere Dokumente in einen `Anlagen/`-
  Unterordner zu legen; der Ordnerpfad steht danach in der Ausgabe:
  ```
  python scripts/setup_bewerbungsordner.py --firma "<Firma>" --lebenslauf "<Pfad-zum-Lebenslauf>" ["<weiterer-Pfad>" ...] --anlagen "<Pfad-zu-Zeugnis>" ["<weiterer-Pfad>" ...]
  ```
- Das bestätigte Anschreiben aus Schritt 6 in eine Textdatei schreiben und mit
  `scripts/erstelle_anschreiben_pdf.py` direkt in den Bewerbungsordner rendern:
  ```
  python scripts/erstelle_anschreiben_pdf.py --text "<pfad>/anschreiben.txt" --ausgabe "<Ordnerpfad>/Anschreiben_<Firma>.pdf"
  ```
- Dem Nutzer den fertigen Ordnerpfad und die enthaltenen Dateien nennen.

## Leitplanken
- Inhalte — Anschreiben wie generierter Lebenslauf — ausschließlich aus dem tatsächlichen Lebenslauf bzw. den Interview-Antworten des Nutzers ableiten, nichts hinzuerfinden.
- Ein Foto nur einbinden, wenn der Nutzer ausdrücklich einen Bildpfad nennt.
- Bewerbungsunterlagen nur lokal ablegen — der Skill verschickt nichts automatisch, das Versenden bleibt beim Nutzer.
- Lebenslauf- und Anschreiben-Inhalte bleiben in den Chat-Dateien des Nutzers, nicht im Skill-Code.

## Ausblick
Dieser Skill deckt aktuell den MVP ab: Anschreiben aus Anzeige + Lebenslauf (vorhanden oder per Interview neu erstellt). Geplant sind ein automatisches Einlesen von GitHub-Projekten für passende Beispiele sowie aktive Stellensuche im Web — siehe [README.md](README.md).
