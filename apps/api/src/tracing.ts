import * as appInsights from 'applicationinsights';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

// 1:1 aus ai-trip-planer/apps/api/src/tracing.ts übernommen. Application
// Insights ist nur aktiv, wenn die Connection-String-Variable gesetzt ist
// (in Azure provisioniert infra/modules/container-app.bicep die Ressource).
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights
    .setup()
    .setAutoCollectConsole(true, true)
    .setSendLiveMetrics(true)
    .start();
}

// Ohne gesetzte Langfuse-Keys bleibt der globale OpenTelemetry-Tracer der
// No-Op-Tracer aus @opentelemetry/api - startActiveObservation() (siehe
// job-postings.service.ts, cover-letters.service.ts) läuft dann klaglos
// durch, ohne etwas zu senden.
if (process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
  new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor()],
  }).start();
}
