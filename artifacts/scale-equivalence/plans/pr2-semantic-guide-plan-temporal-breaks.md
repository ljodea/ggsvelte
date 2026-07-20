# PR 2 plan: semantic axis GuidePlan and temporal breaks

Status: draft for independent Grok and Claude review. No production code may be written until both reviews are resolved.
Base: `origin/main` at `a7a28bb`
Branch: `feat/temporal-guide-plan`
Owner: ljodea
Depends on: PR #336 temporal semantics, PR #341 source-first visual approval

## Goal

Make temporal axes readable and explicit across milliseconds through centuries. Automatic axes must select calendar-aligned breaks using the trained domain, actual panel extent, formatted label widths, temporal kind, locale, and timezone. The same semantic axis plan must drive SVG, canvas chrome, SSR, browser rendering, diagnostics, inspection formatting, and later guide consumers.

The acceptance fixture is the untouched 1835–2025 line chart. It must have proportional temporal spacing and non-overlapping labels at 320, 640, and 1200 CSS px without author tuning.

## User-visible contract

### Automatic behavior

- Temporal axes score a bounded family of calendar candidates from milliseconds through multi-century 1/2/5 steps.
- Candidate ticks align to civil calendar boundaries. Month, quarter, year, week, and day stepping never use average milliseconds.
- Readability is a hard constraint. Prefer 3–7 major labels, but select fewer when measured labels would overlap.
- Default visible labels suppress repeated context only when boundary labels preserve interpretation. Every tick retains an unabridged semantic label.
- Date axes remain calendar-date axes in UTC. Datetime axes format and step in the configured IANA display timezone, defaulting to UTC.
- Defaults use `en-US`, UTC, and ISO Monday week starts so Node SSR and browser output are deterministic.
- Reversed scales retain ascending semantic break values while projection reverses their pixel positions.
- No temporal source is post-processed by generic tick thinning or ellipsis truncation after planning. Only automatic axes may choose a coarser interval. Author-supplied `dateBreaks`, `breaks`, `dateLabels`, and `labels` render exactly as requested; neighbor collisions report `temporal-label-overlap`, while capped-margin overflow reports `temporal-label-margin-overflow`.

### Portable API

Add these closed JSON fields to `PositionScaleSpec`:

```ts
{
  dateBreaks?: string;       // max 128 chars; e.g. "2 weeks", "1 quarter"
  dateMinorBreaks?: string;  // max 128 chars
  dateLabels?: string;       // max 128 chars; closed strftime-style grammar
  locale?: string;           // max 128 chars; BCP 47, default "en-US"
  weekStart?: "monday" | "tuesday" | "wednesday" |
    "thursday" | "friday" | "saturday" | "sunday";
}
```

Existing fields remain supported:

- `breaks` supplies explicit semantic positions.
- `labels` supplies a format string for any continuous axis.
- `timezone` remains the parser/display timezone for datetime scales.

Precedence is explicit:

```text
major positions: explicit breaks > dateBreaks > automatic scored candidates
minor positions: dateMinorBreaks > none
visible labels:  dateLabels > labels > contextual automatic formatter
full labels:     deterministic full formatter, independent of visible abbreviation
```

`dateBreaks`, `dateMinorBreaks`, `dateLabels`, `locale`, and `weekStart` request temporal semantics just like `parse` and `timezone`. They are valid when `type` is omitted or is `"time"`; a non-temporal field then fails with an actionable temporal-contract diagnostic rather than silently ignoring the options. They are invalid on an explicit `band`, `linear`, or `log` override. Invalid interval, locale, timezone, or `dateLabels` configuration fails before data execution with a stable problem/cause/fix diagnostic. Existing `labels` keeps its pre-PR-2 soft fallback and warning behavior for unknown tokens. Portable specs continue to reject callbacks and regular expressions.

When both shorthand and general options are supplied, the documented winner applies and one deduplicated unused-option diagnostic names the ignored setting. `dateMinorBreaks` remains active alongside explicit major `breaks` because it controls a separate tick tier.

Builder methods, ggplot2 aliases, and Svelte scale props inherit the typed options through the existing `PositionScaleSpec`-based helpers. Tests must prove normalized equality for canonical JSON, `.scaleXDate()`, `scale_x_date()`, and Svelte props.

## Interval grammar

Create one parser in `@ggsvelte/spec`, reused by validation and core:

```text
<positive integer> <unit>
unit = millisecond | second | minute | hour | day | week | month | quarter | year
plural "s" is accepted; aliases ms/sec/min are not canonical
```

Constraints:

- Leading/trailing whitespace may be ignored; internal whitespace is one or more ASCII spaces.
- Step is an integer from 1 through 1,000,000.
- Unit and step canonicalize to `{ unit, step, key }`.
- Zero, negative, fractional, unknown, callback, regex, and overlong values fail.
- The parser is linear in input length; schema and runtime cap interval strings at 128 characters.

## Semantic guide contract

Introduce an axis-first `GuidePlan` contract in core. Do not pre-design colorbar or discrete-guide payloads before PR 5/7 have real consumers.

```ts
interface AxisGuideTick {
  // Temporal values are always semantic epoch milliseconds; band values retain CellValue identity.
  value: number | CellValue;
  label: string; // visible, possibly contextual
  fullLabel: string; // standalone semantic text
  kind: "major" | "minor";
}

interface AxisGuidePlan {
  type: "axis";
  id: string; // stable `axis:<aesthetic>:panel:<index>` identity
  aesthetic: "x" | "y";
  panelIndex: number;
  scaleType: "linear" | "log" | "time" | "band";
  temporalKind: "date" | "datetime" | null;
  domain: readonly [number, number] | readonly CellValue[];
  direction: "ascending" | "descending";
  source: "automatic" | "interval" | "explicit";
  interval: string | null;
  locale: string | null;
  timezone: string | null;
  ticks: readonly AxisGuideTick[];
  sourceBreaks?: readonly CellValue[]; // original portable explicit breaks, when supplied
  overlap: boolean; // neighbor collision along the display axis
  marginOverflow: boolean;
  degraded: readonly string[];
}

type GuidePlan = AxisGuidePlan;
```

The exact readonly representation may be adjusted during implementation, but these semantics are required. `RenderModel.guidePlans` exposes one plan per rendered panel axis. Future PRs extend the discriminated union rather than changing axis semantics.

`SceneTick` carries semantic `value`, `fullLabel`, and major/minor kind alongside its pixel position. In both SVG-string and Svelte output, every major `.gg-tick` group emits `<title>{fullLabel}</title>` before its visible line/text children, even if the visible label is empty; SVG-string output XML-escapes the title. Minor ticks are presentation-only and do not add repetitive accessible names. Renderer parity tests compare this exact structure.

`ScenePanel.axisX/axisY` include both tiers: minor entries have `kind: "minor"`, `label: ""`, and no `<title>`; major entries carry visible/full labels. `ScenePanel.grid` becomes `{ x, y, minorX, minorY }`: existing `x`/`y` arrays stay major-only, while explicit temporal minor breaks project into the new minor arrays. The top-level single-panel compatibility `Scene.grid` remains major-only. Minor axis ticks use half the existing tick length and minor grid/tick lines use the same theme roles at 0.5 opacity. These are fixed defaults, not a PR-7 appearance API; PR 7 may expose controls without changing semantics. A coincident major/minor epoch is emitted only as major.

`RenderModel.guidePlans` contains only axes actually drawn by the existing `ScenePanel.axisX/axisY !== null` convention. Every plan has a stable ID. Equivalent fixed-facet plans may share cached computation, but each drawn panel-axis gets its own immutable plan carrying its `panelIndex`; consumers never rely on object identity.

`ScaleDecision` gains `guidePlanIds`, linking field-level parser/inference decisions to one or more panel-axis plans without copying free-facet break arrays into the inference record. The existing playground follows these IDs to explain selected breaks, visible labels, interval/source, and per-panel differences.

## Architecture and data flow

```text
PositionScaleSpec
  ├─ interval/locale/format validation (@ggsvelte/spec)
  └─ parser + temporal kind metadata (existing PR 1 contract)
                    │
                    v
trained semantic panel scales
                    │
                    v
layout Pass A (provisional margins)
  └─ extent + displayOrient(from coord_flip) + TextMeasurer
       → bounded calendar candidates / exact authored breaks
       → visible + complete labels
       → project fractions + measure collisions/margin overflow
       → selected AxisGuidePlan + coarseness fallback ladder
                    │
                    v
layout Pass B (Pass-A margins + selected interval hint)
  └─ retain selected automatic interval when it fits
     or walk coarser-only to fit/exhaustion
       → final AxisGuidePlan + final measured margins + diagnostics
                    │
                    v
SceneTick pixel projection
  ├─ semantic values stay ascending
  └─ reverse + final panel placement affect pixels only
                    │
      ┌─────────────┴─────────────┐
      v                           v
SVG-string chrome          Svelte SVG chrome
                           (also used with canvas marks)
```

The planner is pure and receives all environment-sensitive inputs. It must not read DOM globals, browser locale, system timezone, or current time.

### Calendar engine

- Add interval parsing and civil-time stepping beside the canonical temporal registry in `@ggsvelte/spec` so positional and later color temporal scales share it.
- Reuse the native-first Temporal adapter already backed by `@js-temporal/polyfill`; do not introduce d3-time or a second timezone implementation.
- Fixed sub-day UTC candidates may use integer epoch arithmetic. Zoned datetime day/week/month/quarter/year candidates use `Temporal.ZonedDateTime` boundary/addition operations.
- Date-kind candidates always use UTC calendar boundaries, preserving PR 1’s date contract.
- DST gaps/folds must generate monotonic, unique epoch instants and respect the configured disambiguation policy.
- Candidate generation uses published constants: `MAX_TEMPORAL_CANDIDATES = 128`, `MAX_TEMPORAL_MAJOR_TICKS = 64`, and `MAX_TEMPORAL_MINOR_TICKS = 256`. Automatic candidates over the major cap are skipped; explicit major/minor intervals over their cap fail with `temporal-break-limit` before allocating an output array.
- The automatic table is fixed and totally ordered fine→coarse: milliseconds `[1,2,5,10,20,50,100,200,500]`; seconds/minutes `[1,2,5,10,15,30]`; hours `[1,2,3,6,12]`; days/weeks `[1,2]`; months `[1,2,3,6]`; quarters `[1,2]`; and years from bounded `1/2/5 × 10^k` candidates expanded by increasing duration. When nominal durations tie, the stable unit/step key breaks the tie. Ticks are inclusive when they land exactly on either domain bound.
- Quarter boundaries are Jan/Apr/Jul/Oct. `"1 quarter"` is quarter-aligned and may use quarter labels; `"3 months"` remains month-aligned and is not a semantic alias. Date weeks align in UTC; datetime weeks align in the display zone. `weekStart` selects the named weekday for both.

### Label engine

- Reuse the existing `formatTime` token implementation instead of creating unrelated formatting logic. Its legacy `(ms, pattern)` UTC/en-US token set and unknown-token literal fallback remain unchanged.
- A new compiled temporal-label path powers `dateLabels` and automatic/zoned formatting. It uses a fail-fast closed grammar capped at 128 characters like `temporal.ts`: `%Y %y %m %b %B %d %e %a %A %H %I %M %S %L %p %q %z %Z %%`. New tokens are activated only through this path, so an existing `labels: "%a"` remains literal rather than silently changing meaning. Unlike input `parseExactFormat`, output labels intentionally allow repeated semantic tokens because display formatting has no round-trip uniqueness requirement; only unsupported/dangling tokens fail.
- Date-kind formatting always reads UTC calendar fields. Datetime formatting uses the configured IANA zone and locale. Fixed sub-day epoch stepping does not imply UTC civil labels.
- Keep the hand-rolled month names and formatter path for default `en-US`/UTC output. Use `Intl.DateTimeFormat.formatToParts` for non-default locales/zones; reconstruct supported tokens with deterministic separators and normalize Unicode spaces. Cache formatters by locale/timezone/options.
- Byte-identical SSR/browser guarantees cover Node 22/24 and Chromium/Firefox/WebKit from pinned Playwright 1.61.1, as declared in `support-matrix.json`, with hard goldens for default `en-US`/UTC. Non-default locale tests assert semantic parts and ordering plus Node/browser equality in that matrix, not universal equality across arbitrary ICU versions.
- Automatic labels are sequence-aware. They may include year/month/day context at change boundaries while omitting repeated context between boundaries.
- Full labels are standalone and include enough date, time, and timezone context for semantic output.
- Axis interaction formatters use the same standalone formatter family, never contextual omission. Known source precision is preserved. Otherwise the chosen major interval refines as follows: year→month, quarter/month→date, week/day→hour for datetime but date for date-kind, hour→minute, minute→second, second→millisecond, millisecond→millisecond.

### Layout integration

Refactor tick derivation behind a planner input rather than bolt collision detection onto `layoutPass` after labels are chosen.

- Numeric and band axes retain current behavior through adapters.
- Contextual temporal labels are generated sequence-wise inside the planner. They do not pass through the existing single-value `TickFormatter`; explicit `labels`/`dateLabels` still use that value formatter contract.
- The planner receives semantic `aesthetic` plus display-space `orient: "horizontal" | "vertical"`, `extentPx`, and `reverse`. Coord flip changes `orient`/extent only; the plan remains owned by semantic x or y.
- Automatic temporal planning receives provisional inner extent in each existing pass. Pass A uses a deterministic lexicographic score: valid/capped → zero neighbor overlap → zero margin overflow → prefer 3–7 labels by distance from 5 → coarser on ties → stable unit/step key. If none avoids neighbor overlap, it selects the coarsest valid candidate and marks overlap. Pass A also returns a separately coarseness-ordered fallback ladder. Pass B retains the Pass-A interval whenever it still has zero neighbor overlap; otherwise it walks as many coarser-only ladder entries as needed within that one pass until one fits or the ladder is exhausted. It never re-scores to a finer interval. On exhaustion it keeps the coarsest plan, sets `overlap: true`, emits `temporal-label-overlap`, and remains two-pass. `dateBreaks` and explicit `breaks` bypass candidate reselection in both passes.
- Horizontal overlap uses projected centers plus measured half-widths and `MIN_TEMPORAL_LABEL_GAP_PX = 6`. Vertical overlap uses projected centers plus measured line heights and the same gap.
- Pass B remains final. No third measurement pass is added.
- All temporal plans are exempt from `layoutPass` cap-driven thinning and `truncateToFit`. Automatic-plan interval rescue (never author-supplied `dateBreaks`/`breaks`) happens only through the planner's coarser-only ladder and is triggered by neighbor overlap. After final interval selection, cap overflow is measured once; it does not trigger another walk. If overflow remains, every source preserves labels byte-for-byte, keeps margins capped, sets `marginOverflow: true`, adds the degradation, and emits `temporal-label-margin-overflow`; labels may paint outside the reserved band rather than forcing uncapped layout or ellipsis.
- Facets plan each free scale independently. Fixed facets reuse equivalent semantic computations where domain and extent match.
- Coord flip swaps display orientation and extent but does not change semantic x/y ownership.
- Planner diagnostics return with `PanelLayoutResult`; final model assembly immutably merges them with preflight `scaleDiagnostics`. Layout never mutates `PreparedPanels`.
- `guidePlanIds` are attached to copied `ScaleDecision` records during final assembly after panel plans exist.
- Numeric/log/band adapters emit the same minimal `AxisGuidePlan` shape from their existing tick values (`temporalKind: null`, `source: "automatic"` unless breaks are explicit) without changing their tick algorithms. This keeps the RenderModel surface uniform without pulling PR 3 or PR 7 work forward.

## TDD sequence

No production edit begins until both plan reviews are resolved. Each implementation slice starts with a focused red test, then the smallest implementation that passes it.

### T1: red public API and validation tests

Add failing tests first for:

- TypeBox/runtime/TypeScript acceptance of every new option.
- rejection on explicit band/linear/log overrides;
- invalid intervals, `dateLabels` tokens, locale, week start, and temporal options on inferred non-temporal fields;
- compatibility of existing time-scale `labels` soft fallback;
- precedence and deduplicated unused-option diagnostics for `breaks`+`dateBreaks` and `labels`+`dateLabels`;
- JSON/builder/alias/Svelte normalization equality;
- callbacks and regex remaining forbidden.

Initial command:

```sh
bun test packages/spec/tests/temporal-api.test.ts packages/spec/tests/temporal-interval.test.ts
```

### T2: red interval and calendar property tests

Cover:

- grammar canonicalization and limits;
- 1 ms, 1 sec, 5 min, 6 hr, 10 day, 2 week, 3 month, 2 quarter, 2 year, and multi-century intervals;
- leap day, month end, ISO/default and custom week starts;
- IANA DST spring gap and fall fold;
- monotonic uniqueness, in-domain bounds, deterministic repeated output;
- bounded generation, inclusive bounds, exact quarter boundaries, progression-stall protection, and invalid configuration.

A progression stall means an addition produces an epoch not strictly greater than the previous epoch twice consecutively before the domain end; generation stops with `temporal-break-progression` rather than looping. DST tests cross-product `compatible`, `earlier`, `later`, and `reject` where the interval boundary can encounter a gap/fold.

Then implement shared interval parsing and calendar stepping.

### T3: red formatting tests

Cover:

- every supported token;
- `en-US`, `en-GB`, `fr-FR`, and `ja-JP` month/day output;
- UTC and two IANA zones across DST;
- contextual sequence labels plus standalone full labels;
- date vs datetime precision;
- invalid locale/format configuration;
- cache identity and deterministic output.

Then extend the existing formatter.

### T4: red measured planner tests

Use deterministic `MetricsTableMeasurer` fixtures for:

- the original 191-year domain at 320/640/1200 px;
- milliseconds, seconds, minutes, hours, days, months, quarters, years, and centuries;
- zero-width and zero-span domains;
- reversed scale projection;
- automatic labels never overlap when any bounded candidate fits; exhausted-ladder cases preserve the coarsest labels and emit the explicit overlap diagnostic;
- explicit labels retained byte-for-byte even when overlap or margin caps trigger;
- stable tie-breaking around one-pixel extent changes;
- Pass-A/Pass-B interval retention and monotonic coarsening at W−1/W/W+1, including a shrink that requires at least two fallback steps and an exhausted-ladder case;
- separate neighbor-overlap and margin-overflow flags/diagnostics for every source, including a coarsest automatic label wider than the cap;
- no post-plan thinning or ellipsis for automatic, interval, or explicit temporal labels;
- 3–7 preference when multiple candidates fit;
- bounded candidate/tick counts.

Then implement `AxisGuidePlan` and temporal candidate scoring.

### T5: red pipeline/facet/renderer tests

Cover:

- single-panel and fixed/free facet plans, with plans only for actually drawn axes;
- coord flip display-orientation collision math while retaining semantic aesthetic ownership, and reversed scales;
- explicit breaks/dateBreaks/dateMinorBreaks/dateLabels precedence;
- rowless annotations and explicit temporal domains;
- `SceneTick` semantic values/full labels/kind;
- major/minor scene ticks, split major/minor grid arrays, title-before-children accessibility structure, XML escaping, and SVG-string/Svelte renderer parity;
- explicit ISO-string and epoch-number breaks both becoming epoch-ms tick values while retaining `sourceBreaks`; in-domain values preserve authored order, while out-of-domain values are omitted with one bounded `temporal-break-outside-domain` diagnostic rather than silently dropped;
- `RenderModel.guidePlans`, minimal numeric/band adapters, `ScaleDecision.guidePlanIds`, and CLI JSON safety;
- interaction tooltip/crosshair formatter consistency;
- identical explicit-width SSR/browser guide plans;
- one bounded reflow when container width changes.

### T6: visual, browser, eval, and consumer tests

- Add deterministic eval case 48 for interval labels and parser-free raw years.
- Extend packed-consumer checks to compile and render dateBreaks/dateLabels/locale.
- Add Playwright overlap assertions for 320/640/1200 and semantic full-label checks.
- Update the line/time-axis evidence fixture and generate R/ggplot2 comparison metrics.
- Do not manually commit files under `tests/visual/__screenshots__/`.

## Test matrix

```text
CODE PATHS                                      USER FLOWS
[ ] interval schema + runtime parser            [ ] raw years readable with zero config
  [ ] valid canonical strings                     [ ] 320 / 640 / 1200 no overlap
  [ ] invalid/overflow/bounded errors              [ ] inspect selected interval/labels
[ ] calendar stepping                           [ ] explicit interval/format override
  [ ] UTC date boundaries                         [ ] JSON / builder / alias / Svelte parity
  [ ] IANA datetime + DST                         [ ] invalid config gives exact fix
  [ ] custom week starts                        [ ] SSR first paint equals client at same width
[ ] label formatting                            [ ] resize replans once without semantic drift
  [ ] locale/timezone/token grammar             [ ] tooltip/crosshair use matching context
  [ ] contextual + complete labels              [ ] explicit overlapping labels preserved + warning
[ ] measured candidate scoring                  [ ] minor breaks visible but subordinate
  [ ] x width / y height collision tests        [ ] visual baseline published source-first
  [ ] deterministic tie-breaks
  [ ] explicit settings outrank defaults
[ ] GuidePlan → layout → SceneTick
  [ ] facets / flip / reverse
  [ ] SVG string / Svelte renderer parity
  [ ] decisions / diagnostics / CLI JSON
```

Unit tests cover pure parser, stepping, formatting, and scoring branches. Pipeline integration tests cover semantic ownership, facets, and diagnostics. Svelte/SSR tests cover renderer semantics. Playwright covers physical overlap and responsive behavior. Deterministic evals cover agent authoring.

## Failure modes and rescue

| Failure                                    | Detection                          | Rescue and user-visible result                                                                            |
| ------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Candidate labels overlap                   | measured neighbor bounds           | choose coarser automatic interval; never shrink font or rotate                                            |
| Explicit labels overlap                    | planner neighbor-overlap flag      | preserve labels and emit `temporal-label-overlap` diagnostic                                              |
| Any temporal label exceeds a capped margin | measured orthogonal/edge extent    | never truncate; all sources emit `temporal-label-margin-overflow` if automatic coarsening cannot clear it |
| Pass-A interval no longer fits in Pass B   | Pass-B overlap check               | walk the coarseness ladder until fit/exhaustion; never oscillate finer; exhausted plan reports overlap    |
| DST creates duplicate/non-monotonic ticks  | property tests and monotonic guard | skip duplicate instants; `temporal-break-progression` if two additions fail to advance                    |
| Tiny interval explodes tick count          | generation cap                     | `temporal-break-limit` diagnostic with coarser interval fix                                               |
| Invalid locale differs by host             | constructor preflight              | `invalid-temporal-locale` before render                                                                   |
| Invalid `dateLabels` token                 | closed-grammar preflight           | fail with exact supported-token fix; existing `labels` retains warning/fallback                           |
| Explicit break does not match parser       | parser-keyed break conversion      | fail with path and bounded original-value evidence; never drop silently                                   |
| Node/browser labels differ                 | SSR/browser equality fixtures      | deterministic default path; pinned-matrix Intl parts for explicit locales                                 |
| Facets replan inconsistently               | plan identity tests                | cache by domain/extent/options/measurer semantics                                                         |
| Contextual label loses meaning             | full-label and boundary tests      | fall back to more explicit visible formatter                                                              |
| Minor tick equals major tick               | set difference by epoch            | major wins; no duplicated line or semantic entry                                                          |
| Reversed axis mutates semantic order       | reverse tests                      | retain ascending values; reverse only pixel projection                                                    |

No failure may silently change semantic values, guess locale/timezone, or drop explicit labels.

## Performance budget

- Candidate family count is constant.
- Automatic planning is `O(candidate_count × generated_ticks)` with generated ticks capped.
- Intl formatter construction is cached; formatting stays proportional to emitted ticks.
- Fixed-facet equivalent final Pass-B plans are reusable within one render by a canonical key containing semantic domain, extent, display orientation, reverse, temporal kind, source/intervals, locale, timezone, week start, label format, font metrics, and final interval. Pass-A hints/fallback ladders are ephemeral and never exposed as cached final plans. Do not cache across measurer instances or renders.
- Add benchmark workloads for 191-year resize churn, 100 free facets, and a DST-heavy datetime range.
- Match the existing benchmark harness: median below 2 ms for one axis and 25 ms for 100 facets, with the repository-standard 1.5× headroom recorded in `benchmarks/budgets.json`. Total temporal layout must not exceed 1.5× the existing comparable layout workload until a tighter measured budget is recorded.

## Documentation and evidence

Owning PR deliverables:

- Expand the temporal guide with automatic density, interval grammar, locale/timezone, explicit precedence, and recovery examples.
- Update root/core/spec/Svelte API docs and both canonical/packaged skills.
- Update the playground inferred-choice panel with selected breaks/labels and add a privacy-safe copy-report action that excludes source evidence, field names, and domain values; provide a direct issue route.
- Add `.changeset/` entries for affected public packages.
- Add `artifacts/scale-equivalence/pr2-temporal-guides/` containing fixture data, exact commands, semantic plans, overlap metrics, 320/640/1200 light/dark captures, ggplot2 reference, ggsvelte render, performance result, a dependency/bundle-size delta against PR 1, and explained parity differences.
- Add `docs/decisions/00NN-temporal-guide-plan.md`, recording preservation of the two-pass invariant, candidate scoring versus margin-cap degradation, minor-break defaults, why the existing Temporal/Intl foundation is reused instead of d3-time, the new `temporal-*` degradation taxonomy versus legacy `x:thin`/`x:truncate`, and that `Scene.axes` remains display-bottom/left under flip while GuidePlan aesthetics remain semantic x/y.
- Update capability/lifecycle/generated docs only from checked source data.

## Expected implementation areas

The diff is intentionally cross-surface because schema, engine, renderer, docs, evidence, and tests are one public promise. Likely modules:

- `packages/spec/src/{schema,temporal,index}.ts` and temporal API/interval tests;
- `packages/core/src/layout/{time,format,layout}.ts` plus a focused axis-guide planner module;
- pipeline display/layout/scene assembly and RenderModel guide-plan types;
- `packages/core/src/scene.ts`, SVG scene renderer, major/minor grid emission, fixed minor opacity/length defaults, and core tests;
- Svelte axis/grid renderer and SSR/scene tests; canvas-rendered marks still use the same Svelte SVG chrome, so there is no separate canvas-axis implementation;
- eval prompt/case, consumer compatibility, benchmark workload/budget;
- temporal docs, skills, playground, example metadata, changeset, and evidence.

Do not combine PR 3 transform work, PR 5 color guide payloads, or PR 7 public guide appearance controls into this PR.

## Parallelization

Core work is sequential because interval semantics, formatting, planning, and pipeline integration share contracts:

```text
Lane A: red spec tests → interval parser/stepper → red formatter/planner tests
        → GuidePlan/layout integration → renderer/pipeline tests

Lane B (after GuidePlan freezes): docs + skills + playground report
Lane C (after GuidePlan freezes): R reference + browser/evidence captures
```

Lanes B and C may use separate worktrees. They merge only after Lane A’s public types freeze.

## Repository-wide exit gate

- Focused red tests observed before each implementation slice.
- Package builds, type declarations, docs checks, Svelte checks, lint, formatting, knip, actionlint, zizmor, complete repository tests, deterministic evals, packed consumer, SSR, benchmark budgets, and visual overlap tests pass.
- Independent Grok and Claude plan reviews have every finding fixed or rebutted before code.
- Independent Grok and Claude pre-PR reviews have no unresolved P0/P1; every finding is acknowledged with evidence.
- PR is merged only after required GitHub checks and review pass.
- If source changes visual baselines, merge source first, comment `/approve-visuals` on the merged PR, then merge the generated `vr-update/pr-<n>` PR. VR Compare remains non-required.

## NOT in scope

- Scale transforms, limits/OOB expansion, and positional families beyond current types: PR 3.
- Coordinate transforms or path tessellation: PR 4.
- Color/fill temporal scales and colorbar/colorsteps: PR 5.
- Shape/linetype and mapped size/linewidth/alpha repair: PR 6.
- Public guide appearance/merge/position/collision policy objects: PR 7.
- `coord_fixed` and final integrated evidence board: PR 8.
- Natural-language dates, callbacks, regular expressions, system-locale defaults, full CLDR vendoring, label rotation, scrolling axes, secondary axes, or geographic/radial coordinates.

## Review resolution log

Completed before implementation:

- Grok plan review pass 1: REVISE. Accepted all P0/P1 changes: temporal-label immutability and distinct overflow diagnostics; monotonic Pass-A/Pass-B hysteresis; explicit minor grid representation; compatible `labels` versus strict `dateLabels`; semantic epoch break values plus source preservation; display-orientation collision input; numeric caps/candidate table; and bounded ICU determinism.
- Grok re-review pass 2: REVISE. Fixed all three residual P1s: terminal margin overflow now applies to every source; Pass B walks a total coarseness ladder for multiple steps with explicit exhaustion; and the architecture diagram now places planning/flip orientation inside each layout pass. Also clarified overlap fields, support-matrix pins, legacy `formatTime` compatibility, minor renderer call sites, out-of-domain breaks, and degradation taxonomy.
- Claude plan review: REVISE. Accepted the explicit-label truncation test, exact SVG/Svelte `<title>` semantics, benchmark-harness alignment, dependency-size delta, ADR, drawn-axis cardinality, and closed-grammar consistency findings.
- Claude P0 `AGENTS.md` absence: rebutted. The canonical constraints were injected by the harness from `/Users/liamodea/.pi/agent/AGENTS.md`; the review prompt incorrectly implied a repository-local file. The corrected re-review embeds those constraints.
- Additional self-review fixes: default minor breaks are none; `ScaleDecision` links stable guide IDs rather than duplicating free-facet arrays; planner diagnostics merge immutably after layout; contextual labels bypass the single-value formatter; `ScenePanel.axisX/axisY` explicitly include minor ticks while the top-level compatibility grid remains major-only.
- Claude final re-review: APPROVE. No P0/P1; its two P3 clarifications were folded into the output-label grammar rationale and ADR implementation hook.
- Grok final re-review: APPROVE. No P0/P1; all P2/P3 polish was folded into total candidate ordering/scoring, margin-overflow timing/capping, explicit 128-character schema caps, fixed label gap, final-plan caching, and flip semantics.
- Final verdict: APPROVED. No unresolved plan-review decisions; T1 red tests may begin.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                                                        |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | ------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 1    | CLEAR  | Eight-PR scale program approved in the canonical plan                           |
| Codex Review  | `/codex review`       | Independent second opinion      | 0    | —      | Grok and Claude were explicitly requested instead                               |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | CLEAR  | Two-pass GuidePlan architecture, TDD matrix, failure modes, and budgets locked  |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 1    | CLEAR  | Canonical temporal label/collision contract reused                              |
| DX Review     | `/plan-devex-review`  | Developer experience gaps       | 1    | CLEAR  | Three-surface parity, playground inspection, docs, evals, and evidence assigned |

- **CROSS-MODEL:** Grok and Claude independently approved after all P0/P1 findings were fixed or rebutted with repository evidence.
- **VERDICT:** CEO + DESIGN + ENG + DX + GROK + CLAUDE CLEARED — ready for T1 red tests.

NO UNRESOLVED DECISIONS
