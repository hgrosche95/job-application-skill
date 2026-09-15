# Azure-Deployment

`infra/main.bicep` deployt `apps/api` als eine einzelne Azure Container App
in eine **eigene** Resource Group (`job-application-skill-dev-rg`) - bewusst
getrennt von `ai-trip-planer`s `trip-planner-dev-rg`, nicht in dessen
Container-Apps-Environment. Beide Repos bleiben dadurch unabhängig
deploybar: kein Deploy-Workflow muss die Azure-Resource-IDs des jeweils
anderen Repos kennen, keine Reihenfolge-Abhängigkeit zwischen beiden
Deployments.

## Bekannte, bewusst nicht gelöste Grenzen

- **Kein persistenter Speicher.** `RESUMES_DIR`/`APPLICATIONS_DIR` zeigen auf
  einen lokalen Pfad im Container - bei Scale-to-Zero (Default: `minReplicas: 0`)
  oder einem Neustart ist der Inhalt weg. Für dieses Deployment (Demo/Portfolio)
  unproblematisch; für echten Gebrauch bräuchte es einen Azure-Files-Mount
  oder Blob Storage statt lokalem Dateisystem - bewusst nicht mitgebaut, weil
  PLAN.md das für Phase 6 nicht verlangt.
- **`python3`, nicht `python`.** `PYTHON_BIN=python3` ist im Bicep fest
  gesetzt, weil `node:20-slim` (Debian) keinen `python`-Symlink hat - anders
  als der lokale Windows-Standard in `apps/api/.env.example`.

## GitHub Secrets (für `deploy.yml`)

Dieselben OIDC-Federated-Credential-Grundlagen wie `ai-trip-planer` (siehe
dessen `docs/deployment.md`) - eine App-Registrierung mit einer zusätzlichen
Federated Credential, deren Subject auf `repo:hgrosche95/job-application-skill:ref:refs/heads/main`
zeigt (oder eine eigene App-Registrierung, falls getrennte Identitäten
bevorzugt werden).

| Secret | Zweck |
| --- | --- |
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | OIDC-Login gegen Azure |
| `GHCR_PAT` | GitHub PAT mit `read:packages`, als Registry-Passwort in der Container App (nicht das ephemere `GITHUB_TOKEN` - die App zieht das Image ggf. Stunden später aus dem Scale-to-Zero-Stillstand heraus erneut) |
| `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `JWT_SECRET` | Login gegen `/auth/login` |
| `GROQ_API_KEY`, `ANTHROPIC_API_KEY` | LLM-Provider (Groq Standard, Anthropic Fallback) |
| `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` | Optional - dasselbe geteilte Langfuse-Projekt wie `ai-trip-planer` (Phase 4). Leer lassen deaktiviert Tracing sauber. |

## Manuell deployen

```bash
az group create --name job-application-skill-dev-rg --location germanywestcentral

az deployment group create \
  --resource-group job-application-skill-dev-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters \
    containerImage="ghcr.io/<owner>/job-application-skill-api:<tag>" \
    registryUsername="<github-user>" \
    registryPassword="<ghcr-pat>" \
    authUsername="<username>" \
    authPasswordHash="<bcrypt-hash>" \
    jwtSecret="<secret>" \
    groqApiKey="<key>"
```
