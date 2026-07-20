/**
 * server/metrics.ts — Priority 5.1 business metric stubs.
 */
type Counter = { name: string; value: number };

const counters = new Map<string, number>();

function bump(name: string, n = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + n);
}

export const metrics = {
  confirmationsSent(): void {
    bump("sl_confirmations_sent_total");
  },
  licenseScoreRecalcMs(ms: number): void {
    bump("sl_license_score_recalc_ms", Math.round(ms));
  },
  payoutTransferFailure(): void {
    bump("sl_payout_transfer_failures_total");
  },
  copilotTokens(n: number): void {
    bump("sl_copilot_tokens_total", n);
  },
  snapshot(): Counter[] {
    return [...counters.entries()].map(([name, value]) => ({ name, value }));
  },
};
