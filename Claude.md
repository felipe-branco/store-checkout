# AI Agent Guidelines

Guidelines for AI agents working on this codebase.

## Overview

- Event sourcing with [@event-driven-io/emmett](https://github.com/event-driven-io/emmett) via `@em-slices/event-store`
- Vertical slice architecture in `packages/slices/src/`
- Next.js 15.5.9 web app (`apps/web-app`)
- Turbo monorepo with pnpm
- **Default UI locale: pt-BR** (`lang="pt-BR"` in root layout). Sample pages use Portuguese copy; change when you fork — see [docs/TEMPLATE.md](docs/TEMPLATE.md).
- **No shipped example slices** — see [docs/TEMPLATE.md](docs/TEMPLATE.md)
- Timestamps and money: [docs/EVENT_SOURCING_BEST_PRACTICES.md](docs/EVENT_SOURCING_BEST_PRACTICES.md)

## Code standards

- TypeScript only; avoid `any`
- **Zod** for runtime validation — [docs/ZOD.md](docs/ZOD.md)
- **Timestamps:** domain `*_at` fields use Unix **milliseconds**
- **Money:** event store amounts in **cents** (integer)
- TDD where practical (Red → Green → Refactor)
- ES modules only

## Development guidelines

- Code in `src/` folders
- Shared TS configs from `packages/tsconfig`
- UI components in `packages/ui/src/` — stack-agnostic skeleton; see [packages/ui/UI_STACK.md](packages/ui/UI_STACK.md)
- Event store in `packages/event-store/src/`
- Slices in `packages/slices/src/{slice-name}/`
- Use `@em-slices/ui` for all UI; do not add MUI or Tailwind to slices until a stack is chosen in `packages/ui`

## Slice workflow

Use the EM CLI (`pnpm em:slice:*`), not legacy Miro generators.

1. Read [docs/TEMPLATE.md](docs/TEMPLATE.md)
2. Follow `packages/em-slice-generator/*_POST_GENERATION_PLAN.md`
3. Register handlers in `commands.ts`, projections in `projections-inline.ts`
4. Wire API routes under `apps/web-app/src/app/api/`

## File structure constraints

- When editing a slice, focus on `packages/slices/src/{slicename}/*.ts` unless building UI
- Do not change `routes*.ts` unless explicitly tasked
- Do not change `*.test.ts` unless explicitly instructed
- After editing a slice, run that slice's tests

## Example slice structure

```
packages/slices/src/
├── {slice-name}/
│   ├── CommandHandler.ts
│   ├── CommandHandler.test.ts
│   ├── ui/
│   └── routes.ts
```

## Workflow orchestration

- Plan non-trivial tasks (3+ steps)
- Verify before claiming done: run tests, lint, build
- Update [tasks/lessons.md](tasks/lessons.md) after user corrections
- Track work in [tasks/todo.md](tasks/todo.md) when appropriate

## Core principles

- Minimize scope — smallest correct diff
- Match existing conventions
- No over-engineering
- Find root causes for bugs
