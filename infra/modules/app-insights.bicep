@description('Azure-Region, in der die Ressourcen angelegt werden.')
param location string

@description('Basis-Name, aus dem die Ressourcennamen abgeleitet werden, z. B. "job-application-skill-dev".')
param namePrefix string

@description('Wie viele Tage Log Analytics die Log-Daten aufbewahrt. Kleinerer Wert = weniger Speicherkosten.')
param logRetentionInDays int = 30

@description('Tägliches Datenlimit in GB für den Log Analytics Workspace, begrenzt die Kosten nach oben.')
param dailyQuotaGb int = 1

// 1:1 aus ai-trip-planer/infra/modules/app-insights.bicep übernommen - völlig
// generisch (nur location/namePrefix-abhängig), keine Anpassung nötig.
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logRetentionInDays
    workspaceCapping: {
      dailyQuotaGb: dailyQuotaGb
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appinsights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
  }
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output logAnalyticsWorkspaceName string = logAnalyticsWorkspace.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
