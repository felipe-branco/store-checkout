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

## Projections rebuild

If read models are empty or stale after pulling slice changes:

```bash
DATABASE_URL=postgresql://store_checkout:store_checkout@localhost:5432/store_checkout \
  pnpm rebuild:projections --all
```

Requires Postgres up (`make db-up`) and the same `DATABASE_URL` as the web app. See [PROJECTION_REBUILD_PLAN.md](./PROJECTION_REBUILD_PLAN.md).

## Manual kiosk E2E (dev)

With `make dev` running and gate env vars **unset** (default local):

1. Open [http://localhost:3000](http://localhost:3000). Tap **Start** if you see the welcome screen (creates cart + `cart_id` cookie).
2. Add at least two items from different categories; confirm the cart panel total and **in stock** badges on the menu.
3. Tap **Pay** → pick a card method → **Simulate payment** (success). Wait for **Payment approved** and a large **order number** (pickup ticket).
4. Tap **Done** (or wait for the countdown) to return to the start screen; cart session ends.
5. **Payment failure:** repeat checkout, choose **Simulate payment failure** → **Payment not completed** with retry / change method.
6. **Stock conflict (optional):** open checkout with items, clear the cart in another tab or via API, then simulate payment on the first tab → **Some items sold out** (no charge).
7. **Add conflict:** with only one unit left on a low-stock item, two browser sessions can race; the loser gets a stock message on add (HTTP 409).
8. `make health` or `curl -s http://localhost:3000/api/health | jq` — `"ok": true`.

Structured API logs appear on the dev server stdout (`withLoggedApiRoute`).

## Verification (before ship)

From repo root (dev server not required for test/lint/build):

```bash
make setup   # if fresh clone
pnpm test
pnpm lint
pnpm build
pnpm em:slice:check-drift --all
```

## Next steps

- [docs/project/README.md](./project/README.md) — spec, EM model, documentation map
- [docs/TEMPLATE.md](./TEMPLATE.md) — first slice walkthrough
