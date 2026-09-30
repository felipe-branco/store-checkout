# Store Checkout

**Web Checkout take-home:** self-service snack bar checkout on a kiosk tablet (menu, order, simulated payment, persistence). Spec: [docs/project/web_checkout_v0.1.pdf](docs/project/web_checkout_v0.1.pdf). Product and modeling notes: **[docs/project/README.md](docs/project/README.md)**.

Built on an **event-sourced vertical slice** stack: PostgreSQL ([Emmett](https://github.com/event-driven-io/emmett) via `@store-checkout/event-store`), **Next.js 15** (React 19, App Router, Turbopack), **pnpm** monorepo with **Turborepo**. UI locale **en-US**. Runtime validation uses **Zod 4**.

Checkout kiosk UI runs at `/` with theme from `@store-checkout/ui` (`checkout-theme.css`). EM slices still in progress — see [docs/project/README.md](docs/project/README.md).

## Monorepo

| Item | Value |
|------|-------|
| Root package | `store-checkout` |
| Package manager | pnpm 10 |
| Node | 24+ (`.nvmrc`) |
| Tasks | `turbo` — `pnpm dev`, `build`, `test`, `lint` |

## Getting started

See **[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)** for prerequisites and env files.

```bash
make setup
make dev
```

Open [http://localhost:3000](http://localhost:3000). With the dev server running, `make health` checks `GET /api/health`.

## Workspace packages (8)

```
apps/web-app/           @store-checkout/web-app — Next.js shell
packages/core/          @store-checkout/core — primitives (errors, money, metadata)
packages/event-store/   @store-checkout/event-store — PostgreSQL / Emmett
packages/slices/        @store-checkout/slices — vertical slices (empty registries)
packages/ui/            @store-checkout/ui — UI skeleton (see packages/ui/UI_STACK.md)
packages/em-manager/    @store-checkout/em-manager — EM migrations CLI
packages/em-slice-generator/  @store-checkout/em-slice-generator — codegen
packages/tsconfig/      @store-checkout/tsconfig — shared TS configs
```

## EM workflow

| Command | Purpose |
|---------|---------|
| `pnpm em:slice:init <title>` | Create slice.ref.json from current snapshot |
| `pnpm em:slice:resolve <dir>` | Resolve slice model from snapshot |
| `pnpm em:slice:generate <dir>` | Generate handler, tests, routes |
| `pnpm em:slice:implement <dir>` | Apply implementation plan |
| `pnpm em:slice:check-drift --all` | Detect drift vs Event Modelers |
| `pnpm em:migration:add` | Add migration from export |

## Database

PostgreSQL 16 via **`docker-compose.yml`**:

```
DATABASE_URL=postgresql://store_checkout:store_checkout@localhost:5432/store_checkout
```

If you previously used different local Postgres credentials, run `docker compose down -v` and recreate volumes.

## Observability (optional, env-gated)

- **Sentry** — `@sentry/nextjs`, `withSentryConfig`
- **Axiom** — `@/lib/axiom/*`
- **Vercel Analytics + Speed Insights** — in root layout
- **Pino** — structured logging via `LOG_LEVEL`

## Documentation

- [docs/project/README.md](docs/project/README.md) — take-home spec and project notes
- [docs/TEMPLATE.md](docs/TEMPLATE.md) — first slice walkthrough
- [docs/SLICE_IMPLEMENTATION_WORKFLOW.md](docs/SLICE_IMPLEMENTATION_WORKFLOW.md)
- [docs/EVENT_SOURCING_BEST_PRACTICES.md](docs/EVENT_SOURCING_BEST_PRACTICES.md)
- [docs/ZOD.md](docs/ZOD.md)
- [packages/ui/UI_STACK.md](packages/ui/UI_STACK.md) — adopt MUI or Tailwind + shadcn
