# PR 2 pre-PR review resolution

Initial independent reviews: Claude `VERDICT: BLOCK`; Grok `VERDICT: BLOCK`. All P0/P1 findings are fixed. Material P2/P3 findings are fixed or explicitly rebutted below.

## Claude findings

| Finding                                               | Resolution                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1 DST gap/fold anchor can throw under `reject`       | **Fixed.** Synthetic calendar boundaries use Temporal `compatible` resolution after source parsing has enforced author disambiguation. The hourly gap/fold matrix covers `compatible`, `earlier`, `later`, and `reject`. |
| P1 non-Latin numbering systems produce `NaN`          | **Fixed.** Numeric extraction pins Gregorian calendar and Latin digits while month/weekday/day-period text remains localized. `fa-IR` regression added.                                                                  |
| P2 schema accepts steps above runtime maximum         | **Fixed.** TypeBox/JSON Schema and runtime share the exact 1…1,000,000 grammar; schema artifact regenerated.                                                                                                             |
| P2 Pass-B hysteresis under-tested                     | **Fixed.** Tests assert W−1/W/W+1 stability, retention, multi-step coarsening, and exhausted-ladder behavior.                                                                                                            |
| P2 margin overflow under-tested                       | **Fixed.** Planner and pipeline tests cover orthogonal/edge caps, byte-identical authored labels, and the stable diagnostic.                                                                                             |
| P2 benchmark workload set incomplete                  | **Fixed.** Added 191-year resize churn, DST-heavy zoned planning, and 100 free facets with measured budgets and evidence.                                                                                                |
| P2 browser evidence incomplete                        | **Fixed.** Added automated 320/640/1200 collision and full-label checks, six light/dark captures, semantic plans, browser metrics, ggplot2 reference, performance, and dependency-size evidence.                         |
| P3 canonical interval error path                      | **Fixed.** Error routing compares canonical parsed interval keys.                                                                                                                                                        |
| P3 fabricated interval for irregular explicit breaks  | **Fixed.** Public explicit plans report `interval: null`; the internal inferred unit is formatting context only.                                                                                                         |
| P3 unparseable break can look out-of-domain           | **Rebutted with regression.** `convertedBreaks` throws `invalid-scale-breaks` before layout; a pipeline test proves the exact code/path.                                                                                 |
| P3 strict `dateLabels` ignored resolved temporal kind | **Fixed.** Formatters use the pipeline-resolved kind.                                                                                                                                                                    |
| P3 runtime/schema Unicode whitespace mismatch         | **Fixed.** Runtime trims ASCII spaces only, matching the schema; NBSP edge cases reject.                                                                                                                                 |
| P3 hard-coded label gap                               | **Fixed.** Planner uses `MIN_TEMPORAL_LABEL_GAP_PX`.                                                                                                                                                                     |
| P3 unbounded Intl cache                               | **Fixed.** Deterministic 64-entry LRU cap.                                                                                                                                                                               |
| P3 `guidePlans` array not frozen                      | **Fixed.** The array and each plan/tick remain frozen.                                                                                                                                                                   |
| P3 top-level compatibility grid leaks minor arrays    | **Fixed.** Top-level `Scene.grid` copies major `x`/`y` only; panel grids retain minors.                                                                                                                                  |
| P3 repeated facet diagnostics                         | **Fixed.** Stable config-level diagnostics dedupe by code and semantic aesthetic.                                                                                                                                        |
| P3 locale-sensitive candidate tie sorting             | **Fixed.** ASCII interval keys use direct lexical comparison.                                                                                                                                                            |
| P3 vacuous minor-tick assertion                       | **Fixed.** Test first requires at least one minor tick.                                                                                                                                                                  |

## Grok findings

| Finding                                                      | Resolution                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 planner ignores locale                                    | **Fixed.** Planner formatting receives `locale`; French month regression added.                                                                                                                                                                                 |
| P1 inferred time axes skip standalone interaction formatters | **Fixed.** Every time scale receives a complete standalone formatter even without a `scales` object; inferred-year formatter now asserts `1835-01-01`.                                                                                                          |
| P2 faceted final placement bypasses Pass-B hint              | **Fixed.** Shared-margin Pass-B plans are retained per panel and supplied to final placement as same-or-coarser hints.                                                                                                                                          |
| P2 evidence/benchmark deliverables incomplete                | **Fixed.** See the completed evidence bundle and four passing temporal performance gates.                                                                                                                                                                       |
| P2 one-sided margin overflow                                 | **Fixed.** Planner receives both edge and orthogonal caps for horizontal/vertical axes.                                                                                                                                                                         |
| P2 DST/hysteresis matrix gaps                                | **Fixed.** Added the requested policy matrix and interval-key assertions.                                                                                                                                                                                       |
| P3 hard-coded gap                                            | **Fixed.** Shared exported constant.                                                                                                                                                                                                                            |
| P3 candidate prefilter undocumented                          | **Fixed/documented.** ADR 0014 records the bounded primary ladder and exhaustive coarser fallback. Tests prove the 3–7 acceptance fixture, neighboring-width stability, multi-step fallback, and exhausted coarsest plan; benchmarks prove the 100-facet bound. |

## Gate evidence

- Package/spec/core suite: 1,220 passed.
- Svelte browser suite: 210 files, 2,847 passed; SSR: 3 files, 15 passed.
- Playground/temporal Playwright: 8 passed.
- Deterministic evals: 48/48 passed.
- Packed npm consumer: passed with Svelte 5.33.1.
- All four new temporal benchmark workloads are within budget. The whole local absolute-budget command is invalidated by unrelated continuously CPU-saturating processes and exceeds only three unchanged legacy workloads; the isolated self-hosted `run-bench` PR lane is authoritative.

## Final PASS re-review follow-ups

Both final re-reviews returned `VERDICT: PASS` with no P0/P1 findings.

- **Unvalidated locale/dateLabels path: fixed.** `runPipeline` now preflights both options into stable `PipelineError` diagnostics before layout; tests assert code, path, severity, problem/cause/fix payloads.
- **Locale JSON Schema semantics: rebutted/documented.** JSON Schema bounds the portable string; BCP 47 canonicalization and host Intl support are semantic runtime checks that JSON Schema cannot express. The emitted description now states this split explicitly.
- **Fixed-facet memoization: rebutted.** The reviewed plan permits, but does not require, within-render reuse. Correct two-pass hints are retained and the 100-free-facet median remains under 25 ms.
- **English `%Z`: rebutted.** Stable short zone identifiers are intentionally resolved in `en-US`; localized month/weekday/day-period text still honors locale. This avoids host-dependent translated zone names.
- **Evidence base SHA: rebutted.** Size delta uses final `origin/main@df1a8c6` after the required #346 merge, not the branch's earlier `a7a28bb` starting point.
- **Retention assertion: fixed.** The test now proves fresh planning chooses `50 years` while a still-fitting `100 years` Pass-A hint is retained.
- **Maximum interval acceptance: fixed.** Exact `1000000 years` acceptance complements the `1000001 years` rejection.
- **Spring DST straddle: fixed.** The matrix now includes an hourly range spanning the spring gap plus the synthetic-gap-anchor case.
- **Duplicate break warning: rebutted with regression.** Continuous temporal breaks are not deduplicated; duplicate in-domain breaks preserve count and do not emit `temporal-break-outside-domain`.
- **Host ICU localization: accepted documented constraint.** Non-default locale byte output follows the pinned support matrix; renderer equality is preserved because formatting happens once in the pipeline.
