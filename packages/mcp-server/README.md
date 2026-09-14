# Bewerbungshelfer MCP-Server

Macht drei Bewerbungshelfer-Fähigkeiten über das
[Model Context Protocol](https://modelcontextprotocol.io) für jeden MCP-Client
(Claude Code, Claude Desktop, ...) nutzbar - über die bestehende NestJS-API
(`apps/api`) aufgerufen, nicht neu implementiert.

## Tools

| Tool | Ruft auf | Zweck |
| --- | --- | --- |
| `match_job_posting` | `apps/api` `POST /job-postings/match` | Gleicht Anzeige und Lebenslauf ab |
| `draft_cover_letter` | `apps/api` `POST /cover-letters` | Entwirft ein Anschreiben (mit `previousDraft`/`feedback` überarbeitbar) |
| `list_applications` | `apps/api` `GET /applications` | Listet vorhandene Bewerbungsordner |

Alle drei brauchen einen JWT gegen `apps/api` - der Server loggt sich beim
ersten Aufruf selbst über `POST /auth/login` ein (Zugangsdaten aus Env) und
cached den Token für die Laufzeit des Prozesses.

## Setup

```bash
# einmalig, im Repo-Root (npm-Workspace)
npm install

cd packages/mcp-server
npm run build
```

### Konfiguration (Env)

| Variable | Default | Zweck |
| --- | --- | --- |
| `BEWERBUNGSHELFER_API_URL` | `http://localhost:3000` | Basis-URL von `apps/api` |
| `BEWERBUNGSHELFER_USERNAME` | – (Pflicht) | Login-Username, wie in `apps/api/.env` |
| `BEWERBUNGSHELFER_PASSWORD` | – (Pflicht) | Login-Passwort im Klartext (das Backend kennt nur den bcrypt-Hash) |
| `MCP_HTTP_TOKEN` | – (Pflicht für den HTTP-Transport) | Bearer-Token, das Clients mitschicken müssen |
| `MCP_HTTP_PORT` | `8787` | Port des HTTP-Transports |

## Zwei Transporte - welcher wofür

| | stdio (`npm start`) | HTTP (`npm run start:http`) |
| --- | --- | --- |
| Wie gestartet | Client startet den Server als eigenen Kindprozess | Server läuft eigenständig, Clients verbinden sich über das Netzwerk |
| Wer kann verbinden | Nur Prozesse auf demselben Rechner, unter derselben Nutzer-Session | Jeder, der Host + Port + Bearer-Token hat |
| Auth nötig? | Nein - die Prozessgrenze selbst ist die Absicherung | Ja, zwingend |
| Typischer Einsatz | Claude Code, Claude Desktop lokal | Später n8n/andere entfernte Clients (Phase 3) |

Ohne Auth könnte bei HTTP jeder, der die URL kennt, Bewerbungsordner anlegen
und den Lebenslauf-Inhalt über die LLM verarbeiten lassen - der HTTP-
Transport verweigert deshalb jede Anfrage ohne gültigen
`Authorization: Bearer <MCP_HTTP_TOKEN>`-Header mit `401`.

## In Claude Code registrieren

```bash
claude mcp add --transport stdio bewerbungshelfer \
  --env BEWERBUNGSHELFER_USERNAME=dein-username \
  --env BEWERBUNGSHELFER_PASSWORD=dein-passwort \
  -- node packages/mcp-server/dist/index.js
```

## Manuell testen (ohne Claude Code)

```bash
npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list

npx -y @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call --tool-name list_applications \
  -e BEWERBUNGSHELFER_USERNAME=dein-username -e BEWERBUNGSHELFER_PASSWORD=dein-passwort
```

## Fehlerhandling

Jedes Tool fängt Fehler (nicht erreichbare API, 401, ungültige Eingabe) ab
und gibt sie als MCP-Tool-Ergebnis mit `isError: true` zurück, statt den
Prozess abstürzen zu lassen.
