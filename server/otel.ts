/**
 * server/otel.ts — Priority 5.1 OpenTelemetry bootstrap.
 * No-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
 */
export async function initOtel(): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  try {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, "")}/v1/traces` }),
      serviceName: process.env.OTEL_SERVICE_NAME ?? "splitsheet",
    } as any);
    await sdk.start();
    console.log(`[otel] tracing enabled → ${endpoint}`);
    process.on("SIGTERM", () => sdk.shutdown().catch(console.error));
  } catch (err) {
    console.warn("[otel] failed to initialize (optional deps missing?)", err);
  }
}

// Fire-and-forget on import
void initOtel();
