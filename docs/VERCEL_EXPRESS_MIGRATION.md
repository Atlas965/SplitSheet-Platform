# Vercel Express Compatibility Migration

SoundLedger / SplitSheet can deploy to Vercel as a full-stack app: Vite SPA + existing Express API (single Fluid function), Neon + Drizzle, Stripe, OIDC.

## Architecture

```text
Vercel
├── server/vercel-entry.ts → bundled to api/index.js (Vercel function)
├── server/index.ts        → listen() for local / Docker / Fly
├── server/app.ts          → shared getApp() factory
├── dist/public            → Vite build (included via vercel.json)
└── Neon PostgreSQL + Drizzle
```

## What changed

| Area | Change |
| --- | --- |
| Entry | Vercel serves bundled `api/index.js` (avoids Node ESM extensionless import failures); `listen()` only in `server/index.ts` |
| Boot migrations | Skipped when `VERCEL=1` or `SKIP_BOOT_MIGRATIONS=true` — run schema push/migrate against Neon separately |
| Stripe webhooks | Global JSON parser skips webhook paths so `express.raw` + signature verify work |
| Static SPA | `serveStatic` resolves `dist/public` for bundled and Vercel layouts |

## Operator checklist (Preview)

1. Create isolated Preview Neon (pooled URL recommended).
2. Apply schema to Preview Neon **before** relying on the app.
3. Set Vercel Preview env from `.env.preview.example` (Stripe **TEST** only).
4. Register OIDC redirect: `https://<preview>/api/callback`.
5. Register Stripe TEST webhooks to `https://<preview>/api/stripe/webhook` (+ Connect if used).
6. Protect the Preview deployment for review.
7. Do **not** attach Production secrets or auto-promote to Production.

## Rollback

- Revert the migration commit(s).
- Local/Fly path (`npm run build` + `npm start` + `server.listen`) remains the long-running entry.
- Repoint Stripe webhooks / `APP_URL` if needed.
- Neon schema is unchanged by this migration.
