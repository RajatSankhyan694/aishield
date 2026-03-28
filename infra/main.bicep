param location string = 'eastus'
param appName string = 'aishield'
param environment string = 'prod'
param repositoryUrl string = ''
param repositoryToken string = ''
param branch string = 'main'

var resourcePrefix = '${appName}-${environment}'
var staticWebAppName = '${resourcePrefix}-swa'
var tags = {
  environment: environment
  app: appName
  createdBy: 'Azure Deployment'
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    repositoryToken: repositoryToken
    buildProperties: {
      appLocation: '/'
      outputLocation: ''
      appBuildCommand: ''
    }
    provider: repositoryUrl != '' && repositoryUrl != 'manual' ? 'GitHub' : 'None'
  }
}

output staticWebAppId string = staticWebApp.id
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppName string = staticWebApp.name
