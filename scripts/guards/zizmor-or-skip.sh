#!/usr/bin/env bash
# Optional local guard: run zizmor over .github/workflows when installed; skip
# gracefully when the binary is missing so developers without the uv tool
# are not blocked. CI's actions-security job always runs a pinned zizmor.
set -euo pipefail

if ! command -v zizmor >/dev/null 2>&1; then
  echo "zizmor: not on PATH — skipping local gate (install via \`uv tool install zizmor\`). CI actions-security still enforces this."
  exit 0
fi

exec zizmor .github/workflows
