# Vercel Express Compatibility Migration

SoundLedger / SplitSheet can deploy to Vercel as a full-stack app: Vite SPA + existing Express API (single Fluid function), Neon + Drizzle, Stripe, OIDC.

## Architecture

```text
Vercel
├── api/index.ts     → Serverless Express entry (@vercel/node bundles import graph)
├── server/index.ts  → listen() for local / Docker / Fly
├── server/app.ts    → shared getApp() factory
├── dist/public      → Vite build (outputDirectory + includeFiles)
└── Neon PostgreSQL + Drizzle
```

## What changed

| Area | Change |
| --- | --- |
| Entry | Committed `api/index.ts` + rewrite `/(.*)` → `/api`; local/Fly still use `server/index.ts` + `listen()` |
| Boot migrations | Skipped when `VERCEL=1` or `SKIP_BOOT_MIGRATIONS=true` — run schema push/migrate against Neon separately |
| Stripe webhooks | Global JSON parser skips webhook paths so `express.raw` + signature verify work |
| Static SPA | Vite emits `dist/public`; Express `serveStatic` also serves those assets from the function |

## Operator checklist (Preview)

1. Create isolated Preview Neon (pooled URL recommended).
2. Apply schema to Preview Neon **before** relying on the app.
3. Set Vercel Preview env from `.env.preview.example` (Stripe **TEST** only).
4. Register OIDC redirect: `https://<preview>/api/callback`.
5. Register Stripe TEST webhooks to `https://<preview>/api/stripe/webhook` (+ Connect if used).
   - **Never** point Stripe at the homepage (`https://splitsheet.ca` / `https://<host>/`) — that returns 405/HTML and looks like a 404 in the Dashboard.
   - Production endpoint: `https://splitsheet.ca/api/stripe/webhook`
   - Connect (payouts) endpoint: `https://splitsheet.ca/api/stripe/connect-webhook`
   - Required subscription events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Set `STRIPE_WEBHOOK_SECRET` (and `STRIPE_CONNECT_WEBHOOK_SECRET` for Connect) in Vercel. Production refuses unsigned webhooks without the secret.
6. Protect the Preview deployment for review.
7. Do **not** attach Production secrets or auto-promote to Production.

## Rollback

- Revert the migration commit(s).
- Local/Fly path (`npm run build` + `npm start` + `server.listen`) remains the long-running entry.
- Repoint Stripe webhooks / `APP_URL` if needed.
- Neon schema is unchanged by this migration.
