targetScope = 'resourceGroup'

@description('Azure-Region für alle Ressourcen.')
param location string = resourceGroup().location

@description('Basis-Name für alle Ressourcen, z. B. "job-application-skill-dev".')
param namePrefix string

@description('Vollständige Backend-Image-Referenz, z. B. ghcr.io/<owner>/job-application-skill-api:<tag>.')
param containerImage string

@description('Benutzername für den GHCR-Login (z. B. GitHub-Benutzer-/Orgname).')
param registryUsername string

@description('Passwort/Token für den GHCR-Login (z. B. ein GitHub PAT mit read:packages).')
@secure()
param registryPassword string

@description('Username fürs Login gegen /auth/login.')
param authUsername string

@description('bcrypt-Hash des Login-Passworts (nicht das Passwort selbst!).')
@secure()
param authPasswordHash string

@description('Geheimer Schlüssel, mit dem das Backend JWTs signiert/verifiziert.')
@secure()
param jwtSecret string

@description('Groq-API-Key fürs Backend (Standard-Provider, kostenloses Tier).')
@secure()
param groqApiKey string

@description('Anthropic-API-Key fürs Backend (Fallback-Provider).')
@secure()
param anthropicApiKey string

@description('Langfuse Secret Key - dasselbe geteilte Langfuse-Projekt wie ai-trip-planer. Optional.')
@secure()
param langfuseSecretKey string = ''

@description('Langfuse Public Key. Optional.')
param langfusePublicKey string = ''

module appInsights 'modules/app-insights.bicep' = {
  name: 'app-insights-deployment'
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module containerApp 'modules/container-app.bicep' = {
  name: 'container-app-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    logAnalyticsWorkspaceName: appInsights.outputs.logAnalyticsWorkspaceName
    appInsightsConnectionString: appInsights.outputs.appInsightsConnectionString
    containerImage: containerImage
    registryUsername: registryUsername
    registryPassword: registryPassword
    authUsername: authUsername
    authPasswordHash: authPasswordHash
    jwtSecret: jwtSecret
    groqApiKey: groqApiKey
    anthropicApiKey: anthropicApiKey
    langfuseSecretKey: langfuseSecretKey
    langfusePublicKey: langfusePublicKey
  }
}

output containerAppUrl string = containerApp.outputs.containerAppUrl
