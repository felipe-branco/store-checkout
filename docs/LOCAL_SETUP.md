# Local setup

Canonical bootstrap uses the root **Makefile**. Prerequisites are checked automatically.

## Prerequisites

- **Node.js 24+** — see [`.nvmrc`](../.nvmrc) (`nvm use` or equivalent)
- **pnpm 10+** — `corepack enable` then `corepack prepare pnpm@10 --activate`
- **Docker** — Docker Desktop or engine + Compose v2 (PostgreSQL)

## First-time setup

From the repo root:

```bash
make setup
```

This runs, in order:

1. `check-deps` — Node, pnpm, Docker
2. `env` — creates `apps/web-app/.env.local` from [`.env.example`](../apps/web-app/.env.example) if missing
3. `db-up` — `docker compose up -d --wait` (Postgres healthcheck)
4. `install` — `pnpm install`

Then start the app and verify:

```bash
make dev
```

In another terminal:

```bash
make health
```

- App: [http://localhost:3000](http://localhost:3000) (kiosk at `/`)
- Health JSON: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Makefile targets

| Target | Purpose |
|--------|---------|
| `make help` | List targets |
| `make setup` | First-time bootstrap |
| `make check-deps` | Verify Node 24+, pnpm 10+, Docker |
| `make env` | Copy web-app `.env.example` → `.env.local` |
| `make db-up` / `db-down` / `db-reset` | Postgres via [docker-compose.yml](../docker-compose.yml) |
| `make dev` | `pnpm dev` |
| `make health` | `curl` `/api/health` (dev server must be running) |
| `make test` / `lint` / `build` | Same as pnpm scripts |

## Environment

**Required for event store / health:** `DATABASE_URL` in `apps/web-app/.env.local`.

Default (matches Docker Compose):

```text
DATABASE_URL=postgresql://store_checkout:store_checkout@localhost:5432/store_checkout
```

**Logging (stdout; optional Axiom mirror):** `LOG_LEVEL` (`info` default). See `apps/web-app/.env.example` for `AXIOM_*`, Sentry, `MAINTENANCE_MODE`, `DEV_USER_ID`.

**Production kiosk gate:** set **`KIOSK_ACCESS_MAGIC_WORD`** (and preferably **`KIOSK_SESSION_SECRET`**) on the deployed web app. The gate runs only when **`NODE_ENV=production`**. Local dev leaves these unset so `/` and `/api/*` work without a cookie. After entering the code, the browser holds an **HttpOnly** `kiosk_session` cookie for API calls. **`GET /api/health`** stays public.

Root [`.env.example`](../.env.example) points at the web-app file; Next.js only loads `apps/web-app/.env.local`.

## Database

Postgres **17** on port **5432** (`store_checkout` / `store_checkout` / database `store_checkout`). Emmett schema migrates on first API use when `DATABASE_URL` is set.

If you previously used the old `em_slices` Docker credentials, run `make db-reset` and update `apps/web-app/.env.local`.

Reset data (destructive):

```bash
make db-reset
```

## SSL / hosted Postgres

For Neon or other hosted providers, set `DATABASE_URL` with `sslmode=require`. See `@store-checkout/event-store` URL normalization.

## Next steps

- [docs/project/README.md](./project/README.md) — spec and EM model
- [docs/TEMPLATE.md](./TEMPLATE.md) — first slice walkthrough
