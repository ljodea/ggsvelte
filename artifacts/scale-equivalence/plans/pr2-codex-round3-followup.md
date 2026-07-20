# PR 2 Codex round-three follow-up plan

## Triage

All five Codex findings on `34d9241` are valid. The multi-day report's Jan 2 example is already aligned under the epoch-based UTC phase, but the underlying defect reproduces with a Jan 3 local minimum: UTC produces Jan 4/6/8 while America/New_York produces Jan 5/7/9.

## TDD sequence

### A. Keep automatic date guides day-or-coarser

- Add a planner regression for a date-kind domain from 2024-01-01 through 2024-01-02. Require an automatic `1 day` interval and midnight-only ticks; the current implementation selects `6 hours`.
- Add a paired datetime regression proving sub-day automatic intervals remain available.
- Add or retain an explicit date-kind `dateBreaks: "6 hours"` regression so the restriction applies only to automatic candidate selection, not authored intervals.
- Filter the automatic interval pool to day/week/month/quarter/year when `kind === "date"`. Apply the same filtered pool to primary, coarser fallback, and Pass-B retention.

### B. Derive explicit-break formatting from all breaks

- Add a pipeline/planner regression with explicit breaks at 2024-01-01, 2025-01-01, and 2025-02-01. Require distinguishable default visible labels for the last two breaks.
- Infer formatting granularity from the smallest non-zero gap across a sorted, deduplicated copy of all surviving explicit breaks. Preserve authored break order and values in the actual guide plan.
- Keep the public explicit plan contract `interval: null`; the inferred interval remains formatting context only.

### C. Give zoned multi-day and multi-week intervals a stable civil phase

- Add interval regressions comparing UTC and America/New_York civil dates for `2 days` from a Jan 3 midday minimum; require the same Jan 4/6/8 phase.
- Add a `2 weeks` case with an explicit `weekStart` to prevent the same domain-minimum-dependent phase from surviving at weekly granularity.
- Convert the current local civil date to an absolute Gregorian day index anchored at 1970-01-01. Align day intervals by `step`, and week intervals by `7 * step` plus the configured weekday offset, before applying the existing minimum skip.
- Continue projecting each aligned `PlainDateTime` boundary with `compatible` disambiguation so the prior DST gap/fold fix remains intact.

### D. Infer domain-only rowless date kind from configured values

- Add a pipeline regression with a non-empty pad row, no x mapping or x annotation, a rowless y rule, and `scales.x: { type: "time", parse: "ymd", domain: ["2024-01-01", "2024-01-03"], dateBreaks: "1 day" }`.
- Require `temporalKind === "date"`, interval planning, date-only complete labels, and no fabricated x `ScaleDecision`.
- Extend kind resolution after annotation evidence to strictly parse configured domain values (and explicit breaks when no domain evidence exists) with the axis conversion. Use the resulting date/datetime kind before the deterministic datetime fallback.
- Do not infer semantics from field names or from epoch magnitude.

### E. Enforce the closed `dateLabels` token grammar in TypeBox and JSON Schema

- Add tier-1 and emitted-schema regressions proving `%Q` is rejected while every documented token and ordinary literal text remain accepted.
- Define one `TemporalLabelSpecSchema` beside the runtime token registry in `temporal-guides.ts`, with min/max length and a pattern that permits non-`%` literals plus only the documented `%<token>` sequences.
- Reuse that schema in `PositionScaleSpec` and regenerate `packages/spec/schema/v0.json`.
- Preserve the stable render-time `invalid-temporal-labels` `PipelineError`: run the existing string semantic preflight before generic schema validation in `normalizeAndValidateSpec`, while leaving non-string shape errors to TypeBox.
- Keep runtime token-specific error text and tier-2 checks for actionable diagnostics; schema pattern enforcement is the portable grammar gate.

## Verification

1. Prove all five new regressions fail on `34d9241` before implementation.
2. Run focused temporal spec/core tests, schema artifact tests, diagnostics completeness, and SSR/core equality tests.
3. Run package type checks, type-aware lint, docs/Svelte checks, generated-artifact freshness, docs build, deterministic evals, and focused Playground tests.
4. Obtain independent Grok and Claude full-diff reviews; fix or rebut every finding.
5. Commit, push through the full pre-push hook, reply to all five Codex threads with evidence, request a fresh Codex review, and resume CI/merge shepherding.
