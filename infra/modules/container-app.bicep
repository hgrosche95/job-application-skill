@description('Azure-Region, in der die Ressourcen angelegt werden.')
param location string

@description('Basis-Name, aus dem die Ressourcennamen abgeleitet werden, z. B. "job-application-skill-dev".')
param namePrefix string

@description('Name des Log Analytics Workspace (aus dem app-insights-Modul), muss in derselben Resource Group liegen.')
param logAnalyticsWorkspaceName string

@description('Application Insights Connection String, wird als Secret an den Container weitergereicht.')
@secure()
param appInsightsConnectionString string

@description('Vollständige Image-Referenz, z. B. ghcr.io/<owner>/<repo>-api:<tag>.')
param containerImage string

@description('Registry-Server, von dem das Image gezogen wird.')
param registryServer string = 'ghcr.io'

@description('Benutzername für den Registry-Login (z. B. GitHub-Benutzer-/Orgname).')
param registryUsername string

@description('Passwort/Token für den Registry-Login (z. B. ein GitHub PAT mit read:packages).')
@secure()
param registryPassword string

@description('Username fürs Login gegen /auth/login.')
param authUsername string

@description('bcrypt-Hash des Login-Passworts (nicht das Passwort selbst!), wird als Secret an den Container weitergereicht.')
@secure()
param authPasswordHash string

@description('Geheimer Schlüssel, mit dem das Backend JWTs signiert/verifiziert.')
@secure()
param jwtSecret string

@description('Groq-API-Key fürs Backend, wird als Secret an den Container weitergereicht. Standard-Provider (kostenloses Tier).')
@secure()
param groqApiKey string

@description('Anthropic-API-Key fürs Backend (Fallback-Provider, siehe LLM_PROVIDER). Optional: leer lassen lässt den Fallback-Provider unkonfiguriert, LLM_PROVIDER bleibt auf groq.')
@secure()
param anthropicApiKey string = ''

@description('Langfuse Secret Key - dasselbe geteilte Langfuse-Projekt wie ai-trip-planer (Phase 4). Optional: leer lassen deaktiviert Tracing sauber, siehe tracing.ts.')
@secure()
param langfuseSecretKey string = ''

@description('Langfuse Public Key.')
param langfusePublicKey string = ''

@description('Langfuse-Host/Region.')
param langfuseBaseUrl string = 'https://cloud.langfuse.com'

@description('Minimale Anzahl Replicas. 0 = Scale-to-Zero, spart Kosten in Ruhephasen - aber auch der Grund, warum RESUMES_DIR/APPLICATIONS_DIR im Container flüchtig sind (siehe apps/api/Dockerfile).')
param minReplicas int = 0

@description('Maximale Anzahl Replicas.')
param maxReplicas int = 3

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

// Container Apps lehnt ein Secret mit leerem Wert hart ab
// ("value or keyVaultUrl and identity should be provided") - anthropicApiKey
// und langfuseSecretKey sind aber echt optional (Fallback-Provider bzw.
// Tracing). Secret+Env-Eintrag deshalb nur anlegen, wenn ein Wert da ist,
// statt einen Platzhalter-Wert zu erfinden, nur um die Validierung zu
// erfüllen.
var optionalSecrets = concat(
  !empty(anthropicApiKey) ? [{ name: 'anthropic-api-key', value: anthropicApiKey }] : [],
  !empty(langfuseSecretKey) ? [{ name: 'langfuse-secret-key', value: langfuseSecretKey }] : []
)
var optionalEnv = concat(
  !empty(anthropicApiKey) ? [{ name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }] : [],
  !empty(langfuseSecretKey) ? [
    { name: 'LANGFUSE_SECRET_KEY', secretRef: 'langfuse-secret-key' }
    { name: 'LANGFUSE_PUBLIC_KEY', value: langfusePublicKey }
    { name: 'LANGFUSE_BASE_URL', value: langfuseBaseUrl }
  ] : []
)

// Eigene Container-Apps-Environment statt die von ai-trip-planer
// mitzunutzen - bewusste Entscheidung (siehe infra/README.md): beide
// Projekte bleiben unabhängig deploybar, kein Cross-Repo-Verweis auf
// Azure-Resource-IDs des jeweils anderen Repos nötig.
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-api'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: concat([
        { name: 'registry-password', value: registryPassword }
        { name: 'auth-password-hash', value: authPasswordHash }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'groq-api-key', value: groqApiKey }
        { name: 'appinsights-connection-string', value: appInsightsConnectionString }
      ], optionalSecrets)
    }
    template: {
      containers: [
        {
          name: 'api'
          image: containerImage
          resources: {
            // Kleinstmögliche Container-Apps-Größe, wie im ai-trip-planer-Vorbild.
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: concat([
            { name: 'PORT', value: '3000' }
            // node:20-slim/Debian hat kein "python"-Symlink, nur "python3"
            // (siehe apps/api/Dockerfile) - abweichend vom lokalen
            // Windows-Default in .env.example.
            { name: 'PYTHON_BIN', value: 'python3' }
            { name: 'AUTH_USERNAME', value: authUsername }
            { name: 'AUTH_PASSWORD_HASH', secretRef: 'auth-password-hash' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'LLM_PROVIDER', value: 'groq' }
            { name: 'GROQ_API_KEY', secretRef: 'groq-api-key' }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
          ], optionalEnv)
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
