#!/usr/bin/env bash
# Path-routing driver for the detect-changes CI job.
# Expected env: EVENT_NAME, GITHUB_REF, BASE_SHA, HEAD_SHA, PR_LABELS, REPO
# Optional: GH_TOKEN (for main base widening via gh api)
# Writes job flags to $GITHUB_OUTPUT via scripts/ci-routing.ts.
set -euo pipefail

zero="0000000000000000000000000000000000000000"
if [ -z "${BASE_SHA:-}" ] || [ "${BASE_SHA}" = "${zero}" ]; then
  echo "no usable base SHA — force-all"
  bun scripts/ci-routing.ts emit-github-output --force-all
else
  # Main + cancel-in-progress: a later markdown/workflow-only push must
  # still route product work from earlier unvalidated main commits.
  # Widen the base to the last successful CI head on main so the
  # replacement run covers the cumulative unvalidated range.
  if [ "${EVENT_NAME}" = "push" ] && [ "${GITHUB_REF}" = "refs/heads/main" ] && command -v gh >/dev/null 2>&1; then
    last_ok="$(
      gh api "repos/${REPO}/actions/workflows/ci.yml/runs?branch=main&status=completed&per_page=20" \
        --jq --arg head "${HEAD_SHA}" '
          [.workflow_runs[]
            | select(.conclusion == "success" and .head_sha != $head)
            | .head_sha][0] // empty
        ' 2>/dev/null || true
    )"
    if [ -n "${last_ok}" ]; then
      echo "widening main route base ${BASE_SHA} → last successful CI ${last_ok}"
      BASE_SHA="${last_ok}"
    fi
  fi
  # Ensure the base object exists for the three-dot diff.
  git fetch --no-tags --depth=1 origin "${BASE_SHA}" 2>/dev/null || true
  if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
    echo "base SHA ${BASE_SHA} not resolvable — force-all"
    bun scripts/ci-routing.ts emit-github-output --force-all
  else
    # --name-status keeps rename/copy source paths for classification.
    mapfile -t files < <(git diff --name-status "${BASE_SHA}...${HEAD_SHA}" || true)
    if [ "${#files[@]}" -eq 0 ]; then
      # Empty diff (empty commit / metadata-only): still run cheap checks.
      echo "empty changed-file set — checks-only routing"
      printf '' | bun scripts/ci-routing.ts emit-github-output --stdin
    else
      printf '%s\n' "${files[@]}" | bun scripts/ci-routing.ts emit-github-output --stdin
      echo "event=${EVENT_NAME} base=${BASE_SHA} head=${HEAD_SHA} files=${#files[@]}"
      # Issue #244: main push re-running the full suite saturates the pool.
      # Keep thinner main surface (checks/unit/build/actions-security);
      # consumer/bench stay PR-primary. force-all paths still full-suite
      # when base is missing.
      # Keep packages_dist + component path-routed on main so Codecov
      # can refresh the packages/svelte flag for branch/main badges
      # (carryforward cannot bootstrap a first main-branch report).
      if [ "${EVENT_NAME}" = "push" ] && [ "${GITHUB_REF}" = "refs/heads/main" ]; then
        {
          echo "consumer=false"
          echo "bench_smoke=false"
          echo "interaction_perf=false"
        } >> "$GITHUB_OUTPUT"
        echo "main push: thinned consumer/bench (issue #244); packages_dist+component stay path-routed for coverage"
      fi
    fi
  fi
fi
# Issue #246: run-compat is an escape hatch for the full required
# consumer matrix even when path routing would skip (docs-only PRs).
# Applied after routing / #244 thinning so the label always wins on PRs.
if [ "${EVENT_NAME}" = "pull_request" ] &&
  printf '%s' "${PR_LABELS:-}" | tr ',' '\n' | grep -qx 'run-compat'; then
  {
    echo "consumer=true"
    echo "packages_dist=true"
  } >> "$GITHUB_OUTPUT"
  echo "run-compat: forced consumer + packages_dist (issue #246)"
fi
