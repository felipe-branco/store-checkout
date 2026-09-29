# EM Slices Starter

Neutral **event-sourced vertical slice** template: PostgreSQL ([Emmett](https://github.com/event-driven-io/emmett) via `@em-slices/event-store`), **Next.js 15** (React 19, App Router, Turbopack), **pnpm** monorepo with **Turborepo**. The sample web shell uses **pt-BR** locale and Portuguese copy; change `lang` and strings when you fork (see [docs/TEMPLATE.md](docs/TEMPLATE.md)). Runtime validation uses **Zod 4**.

No product slices are shipped. Follow **[docs/TEMPLATE.md](docs/TEMPLATE.md)** to add your first slice.

## Monorepo

| Item | Value |
|------|-------|
| Package manager | pnpm 10 |
| Node | 24+ (`.nvmrc`) |
| Tasks | `turbo` — `pnpm dev`, `build`, `test`, `lint` |

## Getting started

See **[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)** for env files and local setup.

```bash
docker compose up -d
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: `GET /api/health`.

## Workspace packages (8)

```
apps/web-app/           @em-slices/web-app — Next.js shell
packages/core/          @em-slices/core — primitives (errors, money, metadata)
packages/event-store/   @em-slices/event-store — PostgreSQL / Emmett
packages/slices/        @em-slices/slices — vertical slices (empty registries)
packages/ui/            @em-slices/ui — UI skeleton (see packages/ui/UI_STACK.md)
packages/em-manager/    @em-slices/em-manager — EM migrations CLI
packages/em-slice-generator/  @em-slices/em-slice-generator — codegen
packages/tsconfig/      @em-slices/tsconfig — shared TS configs
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
DATABASE_URL=postgresql://em_slices:em_slices@localhost:5432/em_slices
```

If you previously used different local Postgres credentials, run `docker compose down -v` and recreate volumes.

## Observability (optional, env-gated)

- **Sentry** — `@sentry/nextjs`, `withSentryConfig`
- **Axiom** — `@/lib/axiom/*`
- **Vercel Analytics + Speed Insights** — in root layout
- **Pino** — structured logging via `LOG_LEVEL`

## Documentation

- [docs/TEMPLATE.md](docs/TEMPLATE.md) — first slice walkthrough
- [docs/SLICE_IMPLEMENTATION_WORKFLOW.md](docs/SLICE_IMPLEMENTATION_WORKFLOW.md)
- [docs/EVENT_SOURCING_BEST_PRACTICES.md](docs/EVENT_SOURCING_BEST_PRACTICES.md)
- [docs/ZOD.md](docs/ZOD.md)
- [packages/ui/UI_STACK.md](packages/ui/UI_STACK.md) — adopt MUI or Tailwind + shadcn
