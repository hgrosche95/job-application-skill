# job-application-skill

Bewerbungshelfer: erstellt aus Lebenslauf und Stellenanzeige ein individuelles Anschreiben und
einen fertigen Bewerbungsordner. Ursprünglich eine reine Claude Code Skill, inzwischen zusätzlich
als eigener Dienst nutzbar — Teil von [life-ops-platform](https://github.com/hgrosche95/life-ops-platform).

## Struktur

- [`bewerbungshelfer/`](bewerbungshelfer/) — die Claude Code Skill selbst (Installation, Umfang,
  Roadmap dort in der README). Läuft eigenständig innerhalb einer Claude-Session, keine der
  anderen Teile hier werden dafür gebraucht.
- [`apps/api`](apps/api) — NestJS-REST-API, die dieselben Kernfähigkeiten (Lebenslauf/Anschreiben
  erzeugen, Stellenanzeige gegen Lebenslauf abgleichen) über HTTP bereitstellt, inklusive
  JWT-Login, LLM-Anbindung (Groq/Anthropic) und Langfuse-Tracing.
- [`packages/mcp-server`](packages/mcp-server) — MCP-Server über dieselbe API, nutzbar aus Claude
  Code/Desktop (`match_job_posting`, `draft_cover_letter`, `list_applications`).
- [`infra/`](infra) — Bicep-Templates + Dockerfile fürs Azure-Deployment von `apps/api`, siehe
  [`infra/README.md`](infra/README.md).

## Lokal starten

```bash
npm install
cd apps/api
cp .env.example .env   # Zugangsdaten/LLM-Keys eintragen
npm run build && npm start
```

## CI/CD

`.github/workflows/ci.yml` baut bei jedem Push/PR (`npm ci && npm run build`).
`.github/workflows/deploy.yml` deployt `apps/api` nach Azure Container Apps, siehe
[`infra/README.md`](infra/README.md) für die nötigen Secrets.
