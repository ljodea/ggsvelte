#!/usr/bin/env bash
# pre-commit guard: test/visual output directories must never be committed.
# pre-commit only invokes this hook with filenames matching its `files:`
# pattern, so being called at all means blocked paths are staged.
set -euo pipefail
echo "BLOCKED: test/visual output paths are generated artifacts and must not be committed:" >&2
for f in "$@"; do
  echo "  $f" >&2
done
echo "Unstage them (git restore --staged <path>) — VR baselines land only via the vr-approve workflow." >&2
exit 1
