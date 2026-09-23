# syntax=docker/dockerfile:1

# ---- deps: install workspace dependencies (npm needs every workspace's package.json
# to resolve the root package-lock.json, even though we only ship apps/api) ----
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/mcp-server/package.json packages/mcp-server/package.json
RUN npm ci

# ---- build: compile the NestJS backend to dist/ ----
FROM deps AS build
WORKDIR /app
COPY apps/api apps/api
RUN npm run build --workspace=apps/api

# ---- prune: drop devDependencies now that the build is done ----
FROM build AS prune
WORKDIR /app
RUN npm prune --omit=dev

# ---- runtime: Node für die API + Python für die Bewerbungshelfer-Scripts
# (erstelle_lebenslauf.py/setup_bewerbungsordner.py/erstelle_anschreiben_pdf.py,
# aufgerufen über scripts/script-runner.service.ts) - node:24-slim ist
# Debian-basiert, python3/pip kommen per apt dazu statt ein zweites
# Basis-Image zu brauchen. --break-system-packages: PEP 668 verbietet
# pip-Installs ins System-Python, in einem Container ohne konkurrierende
# Host-Python-Umgebung ist der Grund dafür (Konflikte mit anderen Tools)
# irrelevant.
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY bewerbungshelfer/requirements.txt /app/bewerbungshelfer/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r /app/bewerbungshelfer/requirements.txt

RUN groupadd --system nestjs && useradd --system --gid nestjs nestjs

COPY --from=prune /app/node_modules /app/node_modules
COPY --from=prune /app/apps/api/dist ./dist
COPY --from=prune /app/apps/api/package.json ./package.json
COPY bewerbungshelfer/scripts /app/bewerbungshelfer/scripts

# RESUMES_DIR/APPLICATIONS_DIR (siehe .env.example) zeigen standardmäßig auf
# lokale Pfade unter diesem WORKDIR - in Container Apps flüchtig (Scale-to-
# Zero, Neustarts löschen den Inhalt). Bekannte, bewusst nicht gelöste
# Grenze dieses Deployments, siehe infra/README.md. mkdir+chown hier, weil
# ResumesService/ApplicationsService das Verzeichnis sonst als nestjs-User
# nicht selbst anlegen dürften (WORKDIR gehört sonst root, aus der COPY-Zeit
# vor USER nestjs).
RUN mkdir -p /app/apps/api/data && chown -R nestjs:nestjs /app/apps/api
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
