# Service Level Objectives — SoundLedger SplitSheet (Priority 5.2)

These SLOs define enterprise expectations for the production platform.

| SLO | Target | Measurement |
| --- | --- | --- |
| API availability | **99.9%** monthly | Successful non-5xx responses on `/api/*` excluding planned maintenance |
| Confirmation link generation (p95) | **&lt; 800ms** | Server time for `POST /api/contracts/:id/generate-confirmations` (or equivalent confirmation token mint) |
| Payout webhook processing | **&lt; 2s** | Time from Stripe webhook receipt to DB reconcile of transfer/payout status |
| CoPilot first-token latency | **&lt; 1.5s** | Time to first SSE token on `POST /api/copilot` when OpenAI is healthy |

## Error budget

At 99.9% availability, monthly error budget ≈ **43 minutes**. Burn alerts should page when budget burn rate exceeds 2× over 1 hour.

## Related metrics (Priority 5.1)

- `sl_confirmations_sent_total`
- `sl_license_score_recalc_ms`
- `sl_payout_transfer_failures_total`
- `sl_copilot_tokens_total`

Export via OpenTelemetry when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`server/otel.ts`, `server/metrics.ts`).
