#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if git diff --name-only HEAD 2>/dev/null | grep -qE 'packages/em-manager/migrations/|slice\.ref\.json'; then
  echo "[em-hook] Running em:migration:diff..."
  pnpm em:migration:diff 2>/dev/null || true
  echo "[em-hook] Running em:slice:check-drift --all..."
  pnpm em:slice:check-drift --all 2>/dev/null || true
fi
