# PR 2 final review and CI follow-up plan

## Scope

Close the five findings from Codex's review of `65ab6ac` and harden the three timing-sensitive CI checks exposed by attempts 1–2 of run `29775874747`. This is a corrective follow-up within PR #348; it does not expand the public API.

## Confirmed failures

1. Zoned `2 hours` ticks beginning after the New York spring-forward gap render at 05:00 and 07:00 instead of preserving the even-hour civil phase at 04:00, 06:00, and 08:00.
2. Temporal interval errors are re-associated by interval text after planning. Equal interval strings can report the wrong axis or report a major failure at `dateMinorBreaks`.
3. `runPipeline` accepts temporal guide options on explicit linear/log scales even though tier-2 validation rejects the same spec, then parses epochs while dropping the guide contract.
4. Millisecond ticks have distinct visible labels but duplicate standalone `fullLabel`/SVG `<title>` values because the full datetime pattern omits `%L`.
5. Parser-backed rowless rule axes can train as time scales without a mapped-field `ScaleDecision`; the missing kind suppresses temporal planning and ignores `dateBreaks`/`dateMinorBreaks`.
6. The generated Playground registry check takes about 5.35s under full Linux coverage and deterministically exceeds Bun's default 5s test timeout, while completing in 1.1s locally when isolated.
7. Playground browser tests sample a deliberately retained 300ms candidate after separate Playwright commands. Under parallel CI the candidate correctly exists but is promoted before later assertions inspect pending status and retained active DOM.
8. The 1,000-member axe regression exceeded its 90s Firefox timeout twice on CI attempts 1 and 2. Chromium completed in 67.0s and WebKit in 53.9s on attempt 2, while both Firefox attempts hit the cap.

## TDD sequence

### A. Preserve civil interval phase across DST gaps

- Strengthen `packages/spec/tests/temporal-interval.test.ts` so the existing spring-forward `2 hours` case expects New York civil times 04:00, 06:00, and 08:00, not merely monotonic epochs. Read those hours through `Intl.DateTimeFormat` with the explicit `America/New_York` zone; never use the test host's local timezone.
- Keep an explicit fold/gap uniqueness assertion.
- Change zoned calendar stepping in `packages/spec/src/temporal-guides.ts` to advance the aligned `PlainDateTime` cursor first and project each civil boundary with `compatible` disambiguation. Never add the interval from a gap-shifted `ZonedDateTime`, because that changes phase.

### B. Carry interval error ownership from the planner

- Add pipeline regressions for:
  - identical `dateBreaks` strings on x/y where only y exceeds the major-tick limit, expecting `/scales/y/dateBreaks`;
  - identical major/minor strings where major planning fails first, expecting `dateBreaks`, not `dateMinorBreaks`.
- In `planTemporalAxis`, wrap `TemporalIntervalError` only around the explicit major `exactCandidate` call and the explicit minor `temporalIntervalTicks` call with immutable `{ aesthetic, option, cause }` context. Leave the automatic candidate path unchanged.
- Preserve the original `TemporalIntervalError` message/cause so `temporal-break-limit` versus `temporal-break-progression` classification and existing diagnostics remain intact.
- Make `finalize-layout-pass.ts` consume the carried `{ aesthetic, option }` directly and delete interval-string re-matching.

### C. Enforce runtime/tier-2 scale parity

- Add core regressions for both explicit linear and explicit log scales with temporal guide options passed to `runPipeline`; expect exactly one structured `scale-type-mismatch` at `/scales/<axis>`.
- Preserve normalization's invalid combination long enough to diagnose it, but add a targeted preflight beside the existing temporal label/locale checks in `normalizeAndValidateSpec`. Mirror the tier-2 message/fix contract and reject before conversion or scale training rather than silently coercing or stripping options.
- Do **not** call `validate(normalized, {})`: that would opt the whole render pipeline into unrelated tier-2 checks and change existing runtime contracts.

### D. Preserve sub-second standalone labels

- Add formatter regressions for: two millisecond ticks in one second with distinct complete `fullLabel` values; a coarser interval whose values still contain sub-second remainders; and whole-second values at second-or-coarser intervals retaining the existing no-`%L` full pattern.
- Include `%L` in the full datetime pattern whenever the selected interval is millisecond-level or any tick epoch has a sub-second remainder. Keep existing second-and-coarser whole-second labels unchanged. Custom `dateLabels` continues to affect only the visible label; the standalone full label remains complete.

### E. Plan parser-only rowless time axes

- Add a pipeline regression with a non-empty pad row, a rowless `xintercept` rule containing date strings, no mapped x field and therefore no x `ScaleDecision`, plus `type: "time"`, `parse: "ymd"`, an explicit x domain, and a distinctive `dateBreaks` such as `"3 days"`. Empty `values: []` is out of scope because `preparePanels` intentionally bypasses annotation-frame construction and cannot train intercepts.
- Assert `GuidePlan.source === "interval"`, canonical `interval === "3 days"`, exact tick epochs, and absence of a fabricated x `ScaleDecision`; do not accept merely day-looking automatic labels.
- Resolve temporal kind in `finalize-layout-pass.ts` in this order: authored/requested `temporalKind`, mapped-field decisions, strict scalar annotation parsing using the axis conversion, then `datetime` only for an explicitly trained parser-only time scale with no stronger evidence. Thread that resolved kind through the existing `displayTemporal` input; formatters are not the failure site.
- Do not fabricate a mapped-field `ScaleDecision` for rowless annotations.

### F. Remove CI timing races without slowing product behavior

- Give the repository-wide generated-seed integrity test an explicit 15s timeout. The assertion and generated-output check remain unchanged; only Bun's generic 5s ceiling changes.
- Replace Playground tests' post-command sampling of the 300ms transient with an init-script `MutationObserver` that records the pending status, candidate `inert`/`aria-hidden` state, focusable/exposed descendants, and retained-active marker at the instant the candidate is mounted. Assert the recorded transition plus the final promoted state. Do not increase the product's 300ms promotion delay.
- Raise only the dense 1,000-member regression's explicit timeout from 90s to 180s, with a comment recording that two Linux Firefox attempts hit 90s while Chromium/WebKit completed in 67s/54s. Do not reduce the accessibility contract or disable retries/browsers.

## Verification

1. Run the new focused spec/core tests first and prove each fails on `65ab6ac` before implementation.
2. Run all temporal spec/core tests, generated-seed tests under coverage, and the two focused Playground Playwright tests.
3. Run formatting, type-aware lint, package/docs checks, docs build, generated artifact freshness, Svelte browser+SSR tests, evals, and the full pre-push gate.
4. Obtain independent Grok and Claude implementation reviews with explicit P0/P1/P2 classification. Fix or rebut every finding.
5. Push, resolve the five Codex threads with test evidence, request a fresh Codex review, and wait for required CI plus human approval.
6. Treat VR Compare as informational. Do not commit `tests/visual/__screenshots__`; after source merge, use `/approve-visuals` and merge the generated `vr-update/pr-348` baseline PR if the intentional Playground/time-axis changes still require it.
