# Store Checkout — local bootstrap (see docs/LOCAL_SETUP.md)
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

COMPOSE ?= docker compose
PNPM ?= pnpm
APP_URL ?= http://localhost:3000
ENV_EXAMPLE := apps/web-app/.env.example
ENV_LOCAL := apps/web-app/.env.local

.PHONY: help check-deps env db-up db-down db-reset wait-db install setup health dev test lint build

help: ## List targets
	@awk 'BEGIN {FS = ":.*## "; print "Targets:"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check-deps: ## Node 24+, pnpm 10+, Docker CLI and daemon
	@command -v node >/dev/null || { echo "error: node not found (install Node 24+ from .nvmrc)"; exit 1; }
	@node -e '\
		const [maj, min] = process.versions.node.split(".").map(Number); \
		if (maj < 24) { \
		  console.error("error: Node 24+ required (see .nvmrc), got " + process.version); \
		  process.exit(1); \
		}'
	@command -v $(PNPM) >/dev/null || { echo "error: pnpm not found (corepack enable && corepack prepare pnpm@10 --activate)"; exit 1; }
	@$(PNPM) -v | awk -F. '{ if ($$1+0 < 10) { print "error: pnpm 10+ required, got " $$0; exit 1 } }'
	@command -v docker >/dev/null || { echo "error: docker not found"; exit 1; }
	@$(COMPOSE) version >/dev/null 2>&1 || { echo "error: docker compose not available"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "error: Docker daemon is not running"; exit 1; }
	@echo "check-deps: ok"

env: ## Copy apps/web-app/.env.example → .env.local if missing
	@if [ ! -f "$(ENV_EXAMPLE)" ]; then echo "error: missing $(ENV_EXAMPLE)"; exit 1; fi
	@if [ -f "$(ENV_LOCAL)" ]; then \
	  echo "env: $(ENV_LOCAL) already exists (unchanged)"; \
	else \
	  cp "$(ENV_EXAMPLE)" "$(ENV_LOCAL)"; \
	  echo "env: created $(ENV_LOCAL)"; \
	fi

db-up: ## Start PostgreSQL (docker compose, wait for healthcheck)
	$(COMPOSE) up -d --wait

db-down: ## Stop PostgreSQL containers
	$(COMPOSE) down

db-reset: ## Reset Postgres volume and restart
	$(COMPOSE) down -v
	$(COMPOSE) up -d --wait

wait-db: db-up ## Alias: ensure Postgres is up and healthy

install: ## pnpm install
	$(PNPM) install

setup: check-deps env db-up install ## First-time bootstrap (Postgres + deps)
	@echo ""
	@echo "Setup complete. Postgres is ready."
	@echo "  make dev     — start Next.js ($(APP_URL))"
	@echo "  make health  — GET /api/health (run dev in another terminal first)"

health: ## Curl /api/health (requires make dev)
	@curl -sfS "$(APP_URL)/api/health" | (command -v jq >/dev/null 2>&1 && jq . || cat)

dev: ## Start web app (turbo dev)
	$(PNPM) dev

test: ## Run monorepo tests
	$(PNPM) test

lint: ## Run linters
	$(PNPM) lint

build: ## Production build
	$(PNPM) build
