# 0021 — The pixel comparison is a required check

Supersedes the source-first publication invariant in
[0012](0012-m3-notes.md) ("Intentional source diffs may leave VR Compare red,
so it is not a required branch-protection check").

## Context

VR Compare measured pixels but could not block a merge. It lives in its own
unprivileged workflow (trust separation — only `vr-compare.yml` executes
unmerged PR code), so `ci.yml`'s `ci-gate` aggregator cannot reach it through
`needs`, and 0012 deliberately kept it off the required list because the
source-first `/approve-visuals` order would deadlock against it: baselines were
regenerated only _after_ the source PR merged, so a required comparison would
have blocked the very merge that unlocks the baselines.

The cost of that decision came due in #732, which changed
`examples/point/scatter-color`'s axis labels. Its comparison went red, as
designed, and it merged anyway; no `/approve-visuals` followed. The baseline
then depicted an example that no longer existed
(`git merge-base --is-ancestor a0ae259d 3234cbc4` → true), and **every**
subsequent PR inherited a 1347-pixel failure in a file it had not touched. Each
author had to independently rediscover that the red job was not their fault.
Issue #742.

## Decision

Make the comparison required, and move pixel changes to the same-PR landing
path so there is nothing left to deadlock.

- `vr-compare.yml` gains a `vr-gate (required pixel aggregator)` job. It runs
  `if: always() && github.event_name == 'pull_request'`, so the context reports
  on every pull request — a required check that sometimes fails to report leaves
  PRs permanently unmergeable, which is a worse failure than the one being
  fixed. The verdict comes from `evaluateVrGate` in
  `scripts/ci-routing/vr-gate.ts`, not from YAML expressions, so it is unit
  tested: routed comparisons must succeed, unrouted ones require nothing, and
  anything else (skipped, cancelled, absent, or untrustworthy routing) fails
  closed.
- Authors commit candidate baselines in the PR that changes the rendering,
  taking the PNGs from the compare run's `vr-baselines` artifact.
  `vr-baseline-guard` already permits baseline diffs paired with
  render-relevant paths; this makes that the normal path rather than the
  preferred-but-optional one.
- `/approve-visuals` is retained for bootstrap (empty baseline directory) and
  for repairing baselines that are already stale on the default branch.

## Consequences

- A rendering change cannot merge with a baseline older than itself, and an
  unrelated PR cannot inherit another PR's baseline debt, because the debt
  cannot land.
- Committed baselines are now _verified_ rather than merely path-guarded. Under
  `maxDiffPixels: 0` a green required comparison proves the committed PNGs are
  byte-identical to the pinned container's render of that exact commit, so a
  hand-crafted or partial baseline fails. This strengthens decision 0009's
  "baselines come only from the pinned container" from a convention into an
  enforced property.
- Intentional pixel changes cost an extra round trip: red compare → download
  artifact → commit PNGs → green compare. That is the price of the guarantee,
  and it replaces a post-merge chore that was silently skippable.
- A genuinely flaky shot now blocks merges instead of being ignorable. `retries`
  is 0 and `maxDiffPixels` is 0 by decision 0009 precisely so that a diff is
  never dismissed as flake; if one appears, fix the determinism rather than
  weakening the gate.
- The check must be added to the "Protect main" ruleset's required contexts
  _after_ the default branch's baselines are green, or the ruleset would block
  every PR on pre-existing debt.
