import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

// 1:1 aus ai-trip-planer/apps/api/src/tracing.ts übernommen (ohne den
// applicationinsights-Teil - der hängt an einem Azure-Deployment, das
// dieses Projekt noch nicht hat, siehe Phase 6). Ohne gesetzte Keys bleibt
// der globale OpenTelemetry-Tracer der No-Op-Tracer aus @opentelemetry/api -
// startActiveObservation() (siehe job-postings.service.ts,
// cover-letters.service.ts) läuft dann klaglos durch, ohne etwas zu senden.
if (process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
  new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor()],
  }).start();
}
