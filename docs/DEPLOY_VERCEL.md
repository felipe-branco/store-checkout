# Deploy to Vercel

The kiosk is **`apps/web-app`** (`@store-checkout/web-app`) inside a **pnpm + Turborepo** monorepo. Vercel must install from the **repo root** so workspace packages resolve.

## Prerequisites

- Git remote (GitHub/GitLab/Bitbucket) with this repository pushed
- **Node 24+** — repo [`.nvmrc`](../.nvmrc) and `package.json` `engines` (set in Vercel **Project → Settings → General → Node.js Version** to **24.x**)
- **Hosted PostgreSQL** — Vercel serverless cannot use local Docker Postgres. Use [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), Supabase, etc.
- Connection string with TLS, e.g. `?sslmode=require` (normalized by `@store-checkout/event-store` for `pg`)

## 1. Create the Vercel project

### Option A — Dashboard (recommended first time)

1. [Import the repo](https://vercel.com/new) on Vercel.
2. **Root Directory:** `apps/web-app` (Edit → set to `apps/web-app`).
3. Enable **“Include source files outside of the Root Directory in the Build Step”** (required for `packages/*` workspace deps).
4. Framework should detect **Next.js**. [`apps/web-app/vercel.json`](../apps/web-app/vercel.json) sets install/build to run from the monorepo root via `pnpm` + `turbo`.
5. Deploy once with env vars from step 2 below (first deploy may fail health checks until `DATABASE_URL` is set).

### Option B — Vercel CLI

From the repo root (Node 24, `pnpm` installed):

```bash
npm i -g vercel   # or pnpm add -g vercel
cd apps/web-app
vercel link       # pick team, link to new or existing project
vercel env pull   # optional: sync env to .env.local for local prod-like tests
vercel --prod
```

CLI uses the same `vercel.json` install/build commands when the linked project’s root directory is `apps/web-app`.

## 2. Environment variables

Set in **Vercel → Project → Settings → Environment Variables** (Production and Preview as needed).

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | Hosted Postgres URL. Emmett schema migrates on first API use. |
| `APP_BASE_URL` | **Yes** | e.g. `https://your-project.vercel.app` — used where absolute URLs matter |
| `KIOSK_ACCESS_MAGIC_WORD` | Recommended in prod | When set, **`NODE_ENV=production`** enables the access gate on `/` and **`kiosk_session`** cookie on `/api/*` (except health, kiosk access, payment webhook). |
| `KIOSK_SESSION_SECRET` | Recommended | Long random secret for signing cookies (do not reuse the magic word in production). |
| `LOG_LEVEL` | Optional | Default `info`; JSON logs on Vercel function stdout |
| `DEFAULT_TIMEZONE` | Optional | e.g. `America/Los_Angeles` |
| `MAINTENANCE_MODE` | Optional | `true` → `/maintenance` + 503 on API (except health) |
| `AXIOM_TOKEN`, `AXIOM_DATASET` | Optional | Structured log mirror |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*` | Optional | Error reporting (see `next.config.ts`) |

Do **not** commit secrets. See [`.env.example`](../apps/web-app/.env.example).

**Local Docker URL will not work on Vercel:**

```text
postgresql://store_checkout:store_checkout@localhost:5432/store_checkout
```

## 3. Verify after deploy

```bash
curl -sS "https://YOUR_DEPLOYMENT.vercel.app/api/health" | jq
```

Expect `"eventStore": "ok"` and `"messageBus": "ok"`.

Manual kiosk flow: [LOCAL_SETUP.md](./LOCAL_SETUP.md) **Manual kiosk E2E** (use production URL; enter magic word if the gate is enabled).

Payment simulator webhook (automations): **`POST https://YOUR_DEPLOYMENT.vercel.app/api/webhooks/payment`** — public by design for the EM translator path (see [api/README.md](../apps/web-app/src/app/api/README.md)).

## 4. Monorepo build notes

- **Build:** `turbo run build --filter=@store-checkout/web-app` (via `vercel.json`).
- **Transpile:** workspace packages are listed in [`next.config.ts`](../apps/web-app/next.config.ts) `transpilePackages` with `outputFileTracingRoot` at the monorepo root.
- **`output: "standalone"`** is for self-hosted `node .next/standalone`; Vercel uses its own Next.js output — no change needed.

## 5. Fresh database / projections

Empty hosted DB is fine: first requests run migrations and inline projections populate as events append.

If you restore a dump or change projection code, run locally against the **same** `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://..." pnpm rebuild:projections --all
```

See [PROJECTION_REBUILD_PLAN.md](./PROJECTION_REBUILD_PLAN.md).

## 6. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Build: cannot find `@store-checkout/*` | Root Directory not `apps/web-app`, or “include files outside root” disabled |
| `DATABASE_URL environment variable is required` | Env not set for Production/Preview |
| Health: event store error | Wrong URL, IP allowlist, or SSL — use provider’s pooled connection string |
| 401 on `/api/cart` in production | Kiosk gate on — open `/`, submit magic word, or call `POST /api/kiosk/access` |
| Module `pg` / native errors | Should be in `serverExternalPackages`; redeploy after dependency changes |

## Related docs

- [LOCAL_SETUP.md](./LOCAL_SETUP.md) — local Postgres and Makefile
- [docs/project/DECISIONS.md](./project/DECISIONS.md) — kiosk gate behavior
- [README.md](../README.md) — monorepo overview
