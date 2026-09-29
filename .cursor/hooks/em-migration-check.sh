#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "[em-hook] EM migration or slice.ref.json changed — running checks..."

pnpm em:migration:diff 2>/dev/null || true

if pnpm em:slice:check-drift --all 2>&1; then
  echo "[em-hook] No drift."
else
  echo "[em-hook] Drift detected (see above)."
fi

# Scaffold Planned slice refs only (no codegen)
pnpm em:slice:init --all-planned 2>/dev/null || true

echo "[em-hook] Reminder: implement one Planned slice at a time; skip Blocked slices."
