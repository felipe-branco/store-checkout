# Local setup

## Prerequisites

- Node.js **24+** (see `.nvmrc`)
- pnpm **10+**
- Docker (PostgreSQL)

## Database

```bash
docker compose up -d
```

Default connection string:

```
DATABASE_URL=postgresql://em_slices:em_slices@localhost:5432/em_slices
```

If migrating from older Postgres credentials, reset volumes:

```bash
docker compose down -v
docker compose up -d
```

## Web app env

```bash
cp apps/web-app/.env.example apps/web-app/.env.local
```

Required: `DATABASE_URL`. Optional: Sentry, Axiom, `DEV_USER_ID`, `MAINTENANCE_MODE`.

## Install and run

```bash
pnpm install
pnpm dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## SSL / hosted Postgres

For Neon or other hosted providers, use `sslmode=require` in the URI. See `@store-checkout/event-store` URL normalization for details.

## Next steps

[docs/project/README.md](./project/README.md) · [TEMPLATE.md](./TEMPLATE.md)
