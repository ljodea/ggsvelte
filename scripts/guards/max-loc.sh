#!/usr/bin/env bash
# pre-commit guard: hand-written code files must stay <= 500 LOC.
#
# Policy (see CONTRIBUTING.md "File size limit"):
# - Scope: git-tracked *.ts *.tsx *.js *.mjs *.cjs *.svelte, excluding spikes/
#   (repo-wide hook convention). Physical lines via awk NR — a missing final
#   newline still counts, blank lines and comments count.
# - Files whose first 5 lines contain both a generator marker ("generat…")
#   and "do not edit" (case-insensitive) are generated artifacts — their
#   regenerators own their size — and are exempt without any list entry.
# - Everything else over the limit must be listed in
#   scripts/guards/max-loc-exclusions.txt as `<path> <baseline-LOC> # reason`.
#   The list is a RATCHET, not a waiver: a listed file may not exceed its
#   baseline, and entries whose file is deleted or now under the limit are
#   STALE and fail the guard until pruned. The list can only shrink.
#
# Invocation:
# - pre-commit passes staged filenames as arguments (works for both the local
#   hook and CI's `pre-commit run --all-files`).
# - `--all` audits every tracked in-scope file in the tree.
set -euo pipefail

LIMIT=500
ROOT="$(git rev-parse --show-toplevel)"
LIST="${MAX_LOC_EXCLUSIONS:-$ROOT/scripts/guards/max-loc-exclusions.txt}"
EXTENSIONS='\.(ts|tsx|js|mjs|cjs|svelte)$'

all_files=0
if [[ "${1:-}" == "--all" ]]; then
  all_files=1
elif [[ $# -eq 0 ]]; then
  printf '%s\n' "usage: max-loc.sh [--all | <file>...]" >&2
  exit 2
fi

# ---- load the exclusion list --------------------------------------------
# BASELINE[path]=loc. Fail closed on malformed or duplicate entries.
declare -A BASELINE=()
if [[ -f "${LIST}" ]]; then
  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line//[[:space:]]/}" ]] && continue            # blank
    [[ "${line}" =~ ^[[:space:]]*# ]] && continue            # comment
    entry="${line%%#*}"                                      # strip reason
    read -r path baseline extra <<<"${entry}"
    if [[ -z "${path:-}" || -z "${baseline:-}" || -n "${extra:-}" ]] \
      || ! [[ "${baseline}" =~ ^[0-9]+$ ]]; then
      printf '%s\n' "MAX-LOC: malformed exclusion entry (want '<path> <baseline-LOC> # reason'): ${line}" >&2
      exit 1
    fi
    if [[ -n "${BASELINE[${path}]:-}" ]]; then
      printf '%s\n' "MAX-LOC: duplicate exclusion entry: ${path}" >&2
      exit 1
    fi
    BASELINE["${path}"]="${baseline}"
  done <"${LIST}"
else
  printf '%s\n' "MAX-LOC: exclusion list missing: ${LIST} (create it, even if empty)" >&2
  exit 1
fi

# ---- collect candidate files --------------------------------------------
declare -a files=()
if [[ "${all_files}" -eq 1 ]]; then
  while IFS= read -r -d '' f; do
    files+=("${f}")
  done < <(git ls-files -z | grep -zE "${EXTENSIONS}" || true)
else
  for f in "$@"; do
    case "${f}" in
      spikes/*) continue ;;
      *.ts|*.tsx|*.js|*.mjs|*.cjs|*.svelte) files+=("${f}") ;;
    esac
  done
fi

# ---- count lines + detect generated markers in ONE pass ------------------
# Emits "<path>\x1f<lines>\x1f<generated?>" per file. NR counts a missing
# final newline, matching `grep -c ''`.
declare -A LOC=() GENERATED=()
if [[ ${#files[@]} -gt 0 ]]; then
  while IFS=$'\x1f' read -r f loc gen; do
    LOC["${f}"]="${loc}"
    [[ "${gen}" == "1" ]] && GENERATED["${f}"]=1
  done < <(awk -v SEP=$'\x1f' '
    FNR == 1 {
      if (prev != "") print prev SEP count SEP gen
      prev = FILENAME; count = 0; gen = 0
    }
    FNR <= 5 {
      h = tolower($0)
      if (h ~ /generat/ && h ~ /do not edit/) gen = 1
    }
    { count++ }
    END { if (prev != "") print prev SEP count SEP gen }
  ' "${files[@]}")
fi

# ---- check ----------------------------------------------------------------
stale=()      # listed but deleted / now under limit -> prune the entry
over=()       # over limit and neither generated nor (validly) listed
ratchet=()    # listed but grew past its baseline

for f in "${files[@]}"; do
  loc="${LOC[${f}]:-0}"
  baseline="${BASELINE[${f}]:-}"
  if [[ "${loc}" -le "${LIMIT}" ]]; then
    if [[ -n "${baseline}" ]]; then
      stale+=("${f} (${loc} <= ${LIMIT})")
    fi
    continue
  fi
  [[ -n "${GENERATED[${f}]:-}" ]] && continue
  if [[ -n "${baseline}" ]]; then
    if [[ "${loc}" -gt "${baseline}" ]]; then
      ratchet+=("${f}: ${loc} > baseline ${baseline}")
    fi
  else
    over+=("${f}: ${loc} lines")
  fi
done

# Listed-but-deleted files never appear in "${files[@]}"; audit them via the
# list itself so stale entries fail even when nothing else changed.
for f in "${!BASELINE[@]}"; do
  [[ -f "${f}" ]] || stale+=("${f} (deleted)")
done

fail=0
if [[ ${#stale[@]} -gt 0 ]]; then
  printf '%s\n' "MAX-LOC: stale exclusion entries — prune these lines from scripts/guards/max-loc-exclusions.txt:" >&2
  printf '  %s\n' "${stale[@]}" >&2
  fail=1
fi
if [[ ${#ratchet[@]} -gt 0 ]]; then
  printf '%s\n' "MAX-LOC: files grew past their exclusion baseline (fix the regression, do not raise the baseline):" >&2
  printf '  %s\n' "${ratchet[@]}" >&2
  fail=1
fi
if [[ ${#over[@]} -gt 0 ]]; then
  printf '%s\n' "MAX-LOC: hand-written code files over ${LIMIT} lines:" >&2
  printf '  %s\n' "${over[@]}" >&2
  printf '%s\n' "Split the file by responsibility. Legacy oversize files live in scripts/guards/max-loc-exclusions.txt (ratchet-only); do not add new entries without a refactor plan." >&2
  fail=1
fi
exit "${fail}"
