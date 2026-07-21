# PR 3 plan: pre-stat scale transforms and positional scale families

Status: approved for implementation. Independent Grok and Claude final gates both returned PASS with no P0/P1/P2 findings on 2026-07-21. Production work must follow the red-first sequence below.
Base: `origin/main` at `180c5e4`
Branch: `feat/scale-transform-position`
Owner: ljodea
Depends on: PR #336 temporal semantics, PR #348 semantic axis GuidePlan

## Goal

Make positional scales a truthful semantic stage instead of a late projection trick. A scale transform must run after typing/parsing and before grouping-sensitive stats and positions; final scale training must be affine in transformed space; axes, zoom, inspection, and source-backed events must still expose semantic/source values.

The acceptance fixtures make the difference observable:

- `scaleXLog10()` changes the values consumed by smooth, bin, density, summary, and boxplot stats.
- Existing `type: "log"` specs receive the corrected pre-stat behavior in place and normalize to the canonical log10 transform contract.
- A future PR-4 `coord_transform(log10)` remains post-stat and therefore produces a different fit. PR 3 records the matching ggplot2 scale-transform fixture and a stage-order golden; PR 4 adds the public side-by-side coordinate fixture without pulling coordinate projection into this PR.
- Brush/zoom inversion returns semantic source-space domains, while geometry is trained and projected from transformed values.

The pipeline order remains:

```text
input typing/parsing
  → pre-stat scale transform + source limits/OOB
  → facets/groups/stats/positions in scale space
  → final affine scale training + breaks/guides
  → post-stat coordinate transform (PR 4)
  → rendering/interactions
```

## Scope and non-goals

This PR owns:

1. one reusable position transform registry (`identity`, `log10`, `sqrt`);
2. parser-keyed and transform-keyed immutable column views shared by facet subsets;
3. source-domain limits and OOB policy before stats;
4. post-stat affine training in transformed space with semantic inversion;
5. complete x/y continuous, binned, log10, sqrt, reverse, date/datetime, and discrete helper families;
6. continuous expansion, explicit major/minor breaks, formatting, reverse, missing-position replacement, diagnostics, docs, evidence, evals, and benchmarks;
7. all current stats and positions consuming the corrected scale-space values.

This PR does not add coordinate transforms, path tessellation, non-position scale families, mapped size/linewidth/alpha, shape/linetype, public guide appearance objects, or fixed aspect layout. Those remain PRs 4–8.

## Portable and authoring contract

### Canonical `PositionScaleSpec`

Extend the existing closed JSON object with:

```ts
type PositionTransformName = "identity" | "log10" | "sqrt";
type PositionOobPolicy = "censor" | "squish";

type ScaleExpansion = {
  mult?: number | readonly [number, number];
  add?: number | readonly [number, number];
};

interface PositionScaleSpec {
  type?: "linear" | "log" | "time" | "band" | "binned";
  transform?: PositionTransformName;
  domain?: readonly CellValue[]; // canonical limits field already shipped
  expand?: ScaleExpansion;
  oob?: PositionOobPolicy;
  naValue?: number | null;
  minorBreaks?: readonly number[];
  // existing nice, zero, reverse, breaks, labels and temporal options remain
}
```

Rules:

- Canonical new continuous specs use `type: "linear"` plus `transform`.
- Existing authored `type: "log"` remains accepted input but `normalize()` rewrites it to `{ type: "linear", transform: "log10" }`. There is no edition branch.
- The legacy-alias matrix is closed: bare `{ type: "log" }` and synonymous `{ type: "log", transform: "log10" }` both canonicalize to `{ type: "linear", transform: "log10" }`; `{ type: "log", transform: "identity" | "sqrt" }` remains uncanonicalized and fails pipeline preflight as `scale-type-transform-conflict` at `/scales/<axis>/transform`. Pure `normalize()` never throws. Red API tests cover every matrix cell.
- `type: "time"` and any temporal request permit only `transform: "identity"` in this PR. Calendar transforms are not guessed.
- `type: "band"` rejects transform, numeric expansion, OOB, `naValue`, and numeric minor breaks. Discrete category-domain and reverse behavior remain unchanged.
- `type: "binned"` accepts quantitative values, identity/log10/sqrt transforms, source domain, expansion, OOB, breaks, labels, reverse, and finite/null `naValue`. It rejects temporal options.
- `domain` stays the canonical JSON spelling for limits. Helper options also accept `limits` as authoring sugar and canonicalize it to `domain`; supplying both is an error.
- Expansion defaults are explicit and deterministic: non-temporal continuous/binned axes use `{ mult: 0.05, add: 0 }`; time axes retain zero expansion so PRs 1–2 domains, GuidePlans, and screenshots do not drift. Transformed domains expand in transformed space. A pinned `domain` still receives display expansion, but OOB uses the unexpanded transformed limits. `expand: { mult: 0, add: 0 }` disables padding. `packages/svelte/src/lib/zoom/zoom.ts`'s concrete `zoomScale()` write-back must set both `nice: false` and `expand: { mult: 0, add: 0 }`, so an inverted display domain is not expanded again. Tests prove brush → emit → reapply and repeated identical brushing are pixel/domain-idempotent with no margin creep.
- A scalar expansion applies to both ends; a tuple is `[lower, upper]`. Values must be finite and non-negative. Unknown keys and overlong arrays fail TypeBox/runtime validation.
- `oob: "censor"` is the default for continuous scales. It replaces finite values outside explicit source limits with missing before stats. `squish` clamps them to the nearest source limit before transform/stats. Transform-domain failures (log10 `<= 0`, sqrt `< 0`) are censored with a targeted transform diagnostic; OOB cannot make an invalid transform input valid unless explicit limits plus squish actually clamp it into the valid domain.
- `naValue` defaults to `null` (remain missing). A finite number replaces missing/censored positional values after OOB resolution and before transform, and is itself checked against transform/domain rules. This mirrors position-scale replacement without accepting callbacks or non-JSON sentinels.
- `minorBreaks` is an explicit bounded array in semantic source units. Coincident major/minor values emit only the major tick. Date/time continues to use `dateMinorBreaks`; supplying both emits an unused-option diagnostic naming the winner.
- Explicit major/minor breaks are transformed exactly once for pixel placement, retain semantic values/full labels in `GuidePlan`, preserve authored order, and are filtered against the unexpanded semantic domain.
- `reverse` remains output direction, not a mathematical transform. `scaleXReverse()`/`scaleYReverse()` produce identity continuous scales with `reverse: true`.

### Helper families

Export normal camelCase helpers and ggplot2 aliases from `@ggsvelte/spec`, `@ggsvelte/core` where applicable, and `@ggsvelte/svelte`:

```text
scaleXContinuous / scale_x_continuous
scaleYContinuous / scale_y_continuous
scaleXBinned     / scale_x_binned
scaleYBinned     / scale_y_binned
scaleXLog10      / scale_x_log10
scaleYLog10      / scale_y_log10
scaleXSqrt       / scale_x_sqrt
scaleYSqrt       / scale_y_sqrt
scaleXReverse    / scale_x_reverse
scaleYReverse    / scale_y_reverse

(existing date, datetime, and discrete families remain)
```

Snake-case names are binding aliases of the camelCase functions. Fluent `GGBuilder` methods exist for every camelCase family. Helper output is canonical, immutable-by-value, and normalized-equal to direct PortableSpec and Svelte `scales` props. The checked capability ledger generates/validates the claimed family list.

## Runtime architecture

### Transform registry

Add a pure core registry with no DOM and no callbacks:

```ts
interface ScaleTransform {
  readonly key: "identity" | "log10" | "sqrt";
  forward(value: number): number;
  inverse(value: number): number;
  valid(value: number): boolean;
}
```

- identity: every finite value;
- log10: finite `> 0`;
- sqrt: finite `>= 0`;
- inverses are identity, `10 ** x`, and `x ** 2`.

Registry lookup is exhaustive and returns stable `invalid-scale-transform` errors for impossible runtime input. No `eval`, dynamic import, regex, or callback path exists.

### Immutable transformed views

Generalize `ColumnTable` with a second cache layer:

```ts
interface TransformedColumnView {
  readonly raw: readonly CellValue[];
  readonly semantic: Float64Array; // parser result, source units
  readonly transformed: Float64Array; // post-OOB/NA/forward, scale units
  readonly valid: Uint8Array;
  readonly parserKey: string;
  readonly transformKey: string;
  readonly censored: number;
  readonly squished: number;
  readonly invalidTransform: number;
}
```

The cache key extends `ColumnTable`'s existing complete parsed `requestKey` (including timezone, disambiguation, failure policy, and `inferTemporal`/numeric-only mode) with `(transform, semantic limits, OOB, naValue)`. Display locale, reverse, expansion, breaks, and labels do not invalidate the numeric view. Parent tables own full-column views; facet/filter subsets gather parent arrays by source-row mapping. Classification, parsing, and transform execution happen once per source field/configuration, never once per panel.

Do not mutate `ParsedColumnView`, source columns, or PortableSpec. Candidate/source lineage continues to read the original source table. Bounded diagnostics may report counts and sampled row/value evidence but never place full columns in the public model.

### Effective axis program

Resolve one immutable axis program before frames:

```ts
interface PositionScaleProgram {
  axis: "x" | "y";
  family: "continuous" | "binned" | "time" | "band";
  transform: ScaleTransform;
  sourceDomain: [number, number] | null;
  transformedLimits: [number, number] | null;
  oob: "censor" | "squish";
  naValue: number | null;
  expansion: {
    lowerMult: number;
    upperMult: number;
    lowerAdd: number;
    upperAdd: number;
  };
  reverse: boolean;
}
```

Resolution happens after temporal preflight determines source parser/kind and before facet frames/stats. Each binding receives the x/y program beside its conversion context. Structural conflicts fail before data execution. Explicit source domain values reuse the resolved parser, are sorted only for training/OOB, and retain authored source values for diagnostics.

### Stats and positions

Every position read is routed through the effective program:

- identity frames use transformed numeric arrays;
- count on continuous transformed values remains continuous; binned scales first assign deterministic bin indices;
- stat-generated position values carry internal transform provenance per numeric role; deferred transformation never keys from the public `MappedField.source === "stat"` flag:
  - `source-applied`: source aesthetics already forwarded by `TransformedColumnView`;
  - `scale-space`: stat output derived from transformed inputs (smooth x/y/bands, bin x/xmin/xmax, density x grid, summary/boxplot aggregates) and never forwarded again;
  - `semantic-measure`: a stat-invented mapped measure (count, density, scaled/ncount/ndensity and equivalent y-stat columns) forwarded exactly once after computation and before position/final training;
- bin/histogram receives transformed x. Numeric `stat_bin` params `binwidth`, `boundary`, and `center` are interpreted in post-transform x scale-space and are never forwarded/inversed; `bins` is a count and `closed` is topology, not a scale-space value. Scale-level `breaks` remain semantic guide values transformed exactly once;
- density and smooth consume transformed source x/y. Density x is `scale-space`; a mapped density y is `semantic-measure` and receives the y transform once; smooth outputs remain `scale-space`;
- summary and boxplot aggregate transformed source y and remain `scale-space`; count/bin-count outputs are `semantic-measure`;
- rules and xmin/xmax/ymin/ymax use the same parser/transform/OOB path;
- stack, fill, dodge, jitter, and nudge operate in post-stat scale space;
- weights and non-position grouping columns are not transformed;
- only discrete mapped aesthetics split groups. A continuous transform never changes grouping identity;
- position offsets/totals are documented as transformed-space units. This is ggplot2-correct but behaviorally different from the old late projection and is included in migration fixtures;
- all zero-baseline geoms (bar, col, area, density, and histogram through bar/bin) resolve their baseline before final training through one helper: identity and sqrt use transformed `forward(0) = 0`; log10 has no semantic-zero image, so positions use transformed-space origin `0` (semantic inverse `1`), matching ggplot2's transformed-space stack/dodge behavior without evaluating `log10(0)`. Density's current hardcoded `new Float64Array(n)` ymin is replaced by this same helper after its semantic-measure y transform. Stack/fill/dodge all use the same transformed origin; values below semantic 1 occupy the negative transformed side. `zero: true` with log10 is a pre-execution `scale-zero-invalid-for-transform` error. Automatic bar/density zero-forcing and its `zero-forced` advisory are skipped for log10 but retained for non-time identity/sqrt. Source data equal to semantic zero remain invalid log10 inputs and are censored/diagnosed. Add direct identity/dodge/stack/fill tests for bar, col, area, histogram, and density so no baseline depends on the later trained extent.

`computePanelBinRanges` reads cached transformed views. Fixed facets share transformed break grids; free facets train panel-local final domains while still reusing the source transform view.

### Binned position family

Implement the ggplot2 two-phase contract without a generic discrete-scale detour:

1. Before stats, transform valid inputs, derive automatic nice boundaries only in transformed space, inverse-project those boundaries for semantic labels, and map each transformed input to a stable integer bin. Explicit authored `breaks` are semantic source values and are transformed exactly once.
2. Stats that require discrete positions (notably count/bar) consume those bin ids. A retained internal bin-key vector, separate from rendered x/y values, supplies grouping and per-bin resolution to stack/fill/dodge.
3. After stats, map bin ids and generated bounds back to transformed bin centers/edges before final affine training and geometry. Stack/fill/dodge group by the retained bin key while their numeric offsets operate in transformed space. Jitter uses transformed bin width; it never jitters integer ids or source semantic units.
4. Axis GuidePlan keeps semantic source break values and labels; no bin integer escapes through the public model, tooltips, zoom, or source events.
5. Right-closed bins with inclusive lowest bound are the fixed initial policy; later configurability requires a separate reviewed API.
6. Automatic binned boundaries are selected in transformed space, then inverse-projected for semantic GuidePlan values. Explicit authored boundaries remain semantic and are transformed exactly once.

Cap automatic/explicit boundaries at the existing axis tick limits. Empty, zero-width, all-censored, and exact-boundary inputs have deterministic behavior.

### Final affine scale

Split semantic transformation from affine training. Continuous trained scales expose explicit spaces:

```ts
interface ContinuousScale {
  type: "linear" | "time";
  transform: "identity" | "log10" | "sqrt";
  domain: [number, number]; // semantic/source-space display domain
  transformedDomain: [number, number]; // post-stat scale-space display domain
  normalize(value: number): number; // semantic → forward → affine
  normalizeTransformed(value: number): number; // post-stat scale-space → affine
  invert(t: number): number; // affine → inverse → semantic
}
```

Geometry calls `normalizeTransformed`; guides, annotation source values, and public callers use semantic `normalize`. `invert` always returns semantic values. Reverse applies at the affine edge. The old ambiguous use of `normalize` for both semantic and transformed values is removed from internal call sites.

Final training:

- unions post-stat transformed arrays for fixed scales and trains panel arrays for free scales;
- does not serialize continuous scales into the categorical `ScaleState` codec. Public snapshots add only JSON domain/transform metadata; callable scale methods remain runtime model values. Codec tests prove ordinal state is unchanged and transformed continuous domains do not leak into persisted assignment state;
- applies nice/zero in transformed space (`zero` only when zero is valid for the transform);
- applies configured expansion after nice and after post-stat extent collection for both inferred and pinned domains; pinned domains skip nice but not expansion;
- preserves unexpanded transformed limits separately for OOB;
- aliases identity/time transformed arrays to semantic arrays when no OOB/NA rewrite is needed, avoiding an unnecessary O(rows) copy; transformed views remain immutable either way;
- inverse-projects finite transformed display endpoints for the public semantic `domain`;
- never re-forwards post-stat values or source limits.

`type: "time"` remains identity transform with epoch-millisecond semantic/transformed equality, preserving PRs 1–2.

### Guides, scene, and interaction

- Extend layout domains with transform metadata. Automatic continuous ticks are selected in transformed space and inverse-projected to semantic values; log10 retains decade-aware major ticks and sqrt produces finite source labels.
- Explicit breaks/minor breaks and binned boundaries retain semantic values in `AxisGuidePlan`; projection uses semantic `normalize` exactly once.
- Numeric `AxisGuidePlan` stays immutable and axis-first. Add no colorbar/guide appearance fields.
- `AxisGuidePlan.scaleType` remains the scale family (`"linear"`, `"time"`, or `"band"`; binned and sqrt/log10 position families report `"linear"`). Add `transform: "identity" | "log10" | "sqrt"` to the immutable plan. Delete layout `Domain.type: "log"` and its dual dispatch path; numeric tick/grid/formatter dispatch keys from `transform`, not from the removed late `"log"` trained-scale type. Update guide-plan IDs, reports, playground consumers, renderer equality fixtures, and frozen contract tests together.
- `SceneTick.value`, full labels, SVG titles, SSR, Svelte SVG, and canvas semantic chrome retain source semantics.
- Candidate geometry uses transformed frame arrays, while source-backed candidate payloads keep original raw values. Synthesized stat candidates expose inverse-transformed semantic x/y values, not scale-space internals.
- Migrate every Svelte interaction consumer that currently infers log semantics from `ContinuousScale.type`: `SemanticIntervalAxis`, `BoundsScale`, `BoundsEditorInput`, and `PreciseBoundsApplyEvent` become family-plus-transform contracts (`kind/scale: "linear" | "time"`, `transform: "identity" | "log10" | "sqrt"`). `semanticAxisFromBounds`, interval-state bridges, `equalIntervalAxis`, controller canonicalization, interval membership, bounds-editor validation, and `BoundsEditor.svelte` copy key from transform. Log10 requires values/domains `> 0`; sqrt requires `>= 0`; identity/time retain existing finite rules. Add red tests in the existing interaction controller, consumption, interval-state, bounds-editor, and precise-bounds suites for equality, consumption, canonicalization, editor copy/input/apply events, and bridge output so losing trained `type: "log"` cannot silently disable domain checks. Persisted selection state is session-transient and pre-1.0; old `kind: "log"` snapshots are intentionally rejected with migration guidance rather than a compatibility branch.
- Brush and programmatic zoom use `invert`, so domains remain semantic and can be written back as canonical source `domain` values. Reverse/flip composition remains unchanged.
- Axis formatters accept semantic values. Inspection must never double-transform a numeric value.

## Error and diagnostic contract

Add cataloged JSON-safe diagnostics with exact paths, problem/cause/fixes/docs:

- `scale-type-transform-conflict`
- `scale-transform-domain`
- `scale-oob-censored`
- `scale-oob-squished`
- `invalid-scale-expansion`
- `invalid-scale-na-value`
- `invalid-scale-minor-breaks`
- `binned-scale-requires-continuous`
- `binned-scale-break-limit`
- `scale-break-outside-domain`
- `scale-zero-invalid-for-transform`
- `scale-baseline-transformed-origin`
- `unused-scale-option`
- `invalid-scale-transform`

The existing late-log codes are intentionally retired with their branch: an explicit non-positive log10 domain becomes a pre-execution `scale-transform-domain` error; non-positive data becomes one bounded `scale-transform-domain` warning plus the applicable censor count; squished OOB data reports `scale-oob-squished`. Remove `log-domain-not-positive` and `log-nonpositive` from core source/catalog/tests in the same change. Generalize spec lint's separate `log-nonpositive-data` advisory to a transform-aware `transform-domain-data` advisory covering canonical log10 and sqrt forms, update `LINT_CATALOG`, tests, docs, and search projections, and preserve authored `type: "log"` detection before normalization. `scale-break-outside-domain` is a warning and explicit breaks are filtered, matching `temporal-break-outside-domain` ownership. `unused-scale-option` owns generic `minorBreaks` losing to `dateMinorBreaks`. `scale-baseline-transformed-origin` is one deduplicated per-axis advisory at `/scales/<axis>` for every log10 zero-baseline geom: bar, col, area, histogram, and density; `scale-zero-invalid-for-transform` is an error only for explicit `zero: true`.

Diagnostic ownership is explicit: TypeBox/spec validation owns malformed shapes and unsupported enum values; spec lint owns data-profile transform-domain advisories; pipeline preflight owns type/transform conflicts, explicit domain/zero/expansion/naValue/break contradictions, and binned-continuity errors; pipeline warnings own data-dependent transform/OOB/break/baseline events. Data-dependent scale warnings are also materialized through the rich `RenderModel.scaleDiagnostics` path (extending the existing `guidePlanDiagnostics()` assembly and upstream prepared diagnostics) with problem/cause/fixes/docs, not left only in the lean `{ code, message }` warning channel. Every code is entered in its owning catalog with severity and a concrete emit site. Core's existing source↔catalog scanner remains bijective; spec lint gains an equivalent source-scan coverage test in addition to its typed `LINT_CATALOG` guard. The stale division-of-labor comment in `packages/spec/src/lint.ts` is updated when old log codes are removed.

Structural/configuration errors are thrown before data execution. Data-dependent invalid transform/OOB results emit one deduplicated axis/layer diagnostic with counts and at most the repository-standard bounded samples. Empty/all-invalid transformed domains render an honest empty panel with a diagnostic, never malformed SVG. Headless CLI exits non-zero only for errors, not warnings.

Precedence:

```text
explicit parser/type/family
  > helper defaults
explicit source domain
  > inferred source extent
OOB + naValue
  > transform
explicit breaks/minorBreaks/labels
  > automatic guide choices
explicit zero/reverse/nice/expand
  > geom defaults
```

`maybeForceZeroForBars` becomes family- and transform-aware: it forces semantic zero and emits `zero-forced` only when `family !== "time" && transform.valid(0)` (non-temporal identity/sqrt), never for log10 or time. Its signature receives the resolved axis program rather than inferring behavior from the now-canonical `type: "linear"`. `invalid-scale-transform` belongs to the pipeline error catalog at exhaustive registry lookup; schema-valid execution cannot reach it, but the exported runtime registry fails safely and its source/catalog test is explicit.

Temporal `dateMinorBreaks` outranks generic `minorBreaks`; explicit `breaks` continues to outrank `dateBreaks`.

## TDD execution order

No production implementation begins until Grok and Claude pass this plan.

### 0. Inventory and stage guard

Add a machine-readable inventory test enumerating every positional read (`numeric`, `positionValuesToNumeric`, frame numeric arrays, intercepts, bin ranges, geometry normalization, guide projection, zoom inversion). The test fails while any position-semantic caller lacks an axis program/space declaration. A companion provenance inventory assigns every stat output role to `source-applied`, `scale-space`, or `semantic-measure`; public `MappedField.source` is explicitly forbidden as a transform decision key.

Add a pipeline-stage golden that records:

```text
parse → transform/OOB → stat → position → affine train → guide → coord → render
```

and fails on reordering or double transformation.

### 1. Red API/schema/type tests

Before runtime code, add failing tests for:

- TypeBox/runtime/TypeScript/JSON Schema parity for every new field and enum;
- canonical `type: "log"` normalization and conflict rejection;
- canonical JSON, helper, ggplot2 alias, builder, and Svelte normalized equality for every family;
- limits sugar → domain and limits+domain rejection;
- portable callback/regex rejection;
- invalid expand tuples, negative/non-finite expansion, invalid OOB/naValue/minor breaks;
- capability ledger and package root export identity.

Regenerate schema only after red tests establish the intended contract.

### 2. Red transform/cache tests

Add unit/property tests for forward/inverse round trips, validity boundaries, signed zero, very large/small finite values, monotonicity, and no mutation. Add parent/subset cache invocation counters proving one parse/transform per source key across 100 facets and distinct results for different parser/transform/OOB/limits keys.

### 3. Red pre-stat behavior tests

Use simple data with hand-computable expected outputs and ggplot2 R fixtures:

- smooth: log10 scale fits transformed x/y; inverse semantic output is correct;
- bin: authored and automatic boundaries transform once;
- density: transformed x changes estimate/grid;
- summary/boxplot: aggregate transformed y;
- count and binned count: continuous vs bin-id behavior;
- identity annotations and ymin/ymax/rules share the stage;
- invalid log/sqrt values are counted/censored;
- source tooltip/event payload remains unchanged.

### 4. Red position matrix

Cross identity/log10/sqrt/reverse, inferred/pinned limits, censor/squish, and fixed/free facets with:

- identity, count, bin, smooth, density, summary, boxplot stats;
- identity, stack, fill, dodge, jitter, nudge positions;
- the binned family crossed explicitly with stack/fill/dodge/jitter, asserting retained bin keys, transformed-space offsets, and semantic center/edge restoration;
- points, lines, cols/bars, areas, histograms, rules, text, smooth bands, boxplots, density, errorbars;
- zero variance, empty, all invalid, partial invalid, explicit source limits, and stat-generated columns;
- log10 bar/col/area/histogram/density under identity/dodge/stack/fill where applicable: no `zero-forced`, no `log10(0)`, transformed origin 0 (semantic 1), and one bounded baseline advisory; sqrt retains semantic-zero behavior;
- provenance reds that fail on transform²: smooth x/y/bands, bin centers/edges, density x, and summary/boxplot aggregates stay `scale-space`; count/bin-count/density y measures forward exactly once;
- log10 `stat_bin` with `binwidth: 1` and `boundary: 0` uses transformed units (boundary 0 = semantic 1), not `log10(0)`.

Assert transformed geometry and semantic candidate values separately.

### 5. Red final-scale/guide/interaction tests

Prove:

- `normalize` semantic and `normalizeTransformed` scale-space contracts differ correctly;
- semantic → forward → affine → invert round trips;
- no double transform under geometry, explicit breaks, limits, annotations, or zoom;
- expand changes display domain but not OOB limits;
- major/minor scene grids and GuidePlan values are semantic;
- reverse changes pixels but not semantic tick order;
- flip composes after scale inversion;
- SSR/core/Svelte output equality and complete tick titles;
- brush/zoom emits source-space domains; zoom respec forces zero expansion and `nice: false`; brush → emit → reapply and repeating the same pixel brush produce identical domains/pixels with no expansion creep;
- free facets share transform cache but own final affine domains.

### 6. Implementation sequence

Implement only against the red tests:

1. schema/types/normalization/helpers/capabilities;
2. pure transform registry and diagnostics;
3. transformed `ColumnTable` views and facet cache reuse;
4. axis-program resolution after temporal preflight;
5. stats/position call-site migration;
6. binned pre-stat ids and post-stat center/edge restoration;
7. affine transformed-domain trainer and explicit normalize spaces;
8. guide/tick/minor-grid projection;
9. candidate semantic inversion and zoom stability;
10. docs/examples/evals/benchmarks/evidence/generated artifacts.

Delete superseded late-log branches rather than retaining dual execution paths.

## Required tests and gates

Focused commands use the native arm64 Bun path and cover:

- `packages/spec/tests/position-scale-api.test.ts`
- `packages/spec/type-tests/position-scale-parity.ts`
- `packages/core/tests/scale-transform.test.ts`
- `packages/core/tests/pipeline-scale-stage.test.ts`
- `packages/core/tests/pipeline-position-transform.test.ts`
- `packages/core/tests/pipeline-position-matrix.test.ts`
- `packages/core/tests/position-guide.test.ts`
- Svelte assembly/SSR/scene/zoom tests
- deterministic eval case 49
- packed npm consumer

Then run the complete repository suite, build, strict type contracts, type-aware lint, formatting, generated schema/lifecycle/docs/search/seed checks, docs build, examples, Svelte browser+SSR, `knip`, consumer compatibility, benchmark budgets, deterministic evals, and visual tests. Deterministic eval regressions exit non-zero.

## Performance and limits

Add benchmark workloads and budgets for:

1. 100k identity/log10/sqrt transformed points;
2. 100k-row smooth/bin setup without duplicate transforms;
3. 100 facets over 100k rows with one parent transform invocation per key;
4. resize/guide replanning with zero reparsing/retransforming;
5. binned boundary assignment at `MAX_BINNED_BREAKS = 64`, including transformed-space automatic boundaries and semantic inverse labels. TypeBox/runtime and `binned-scale-break-limit` use that same exported constant.

Transform is O(rows) once per key. Binned assignment is O(rows log boundaries) or O(rows) for uniform boundaries, with bounded boundary count. No global/unbounded memoization. Record runtime and retained-array deltas in `artifacts/scale-equivalence/pr3-position-transforms/performance.json` and update `benchmarks/budgets.json` from measured native-runner results.

## Documentation and evidence

Ship with the owning PR:

- task-first position-scale docs: default continuous, log10/sqrt, limits/OOB, binned, breaks/minor breaks, reverse, scale-vs-coordinate staging;
- JSON, builder, ggplot2 alias, and Svelte examples with normalized equality;
- stable diagnostic catalog entries and exact recovery snippets;
- migration note: `type: "log"` now runs before stats and canonicalizes to `transform: "log10"`; pinned `domain` now censors before stats by default (including brush zoom, which intentionally re-runs stats on the zoomed subset rather than acting like a future coord zoom, with a `squish` alternative); position offsets/totals use transformed units; numeric `stat_bin` `binwidth`/`boundary`/`center` use transformed units under log10/sqrt; non-temporal continuous/binned axes now get 5% multiplicative display expansion, including pinned domains, while time is unchanged and `expand: { mult: 0, add: 0 }` restores flush behavior. The changeset includes the required `Migration:` marker and `/guide/upgrading` gets stable adjacent-minor anchors with before/after real Svelte fixtures under `packages/svelte/tests/migrations/`, checked verbatim by `scripts/migration-fixtures.test.ts`. Visual/eval notes call out broad non-time baseline movement. GuidePlan, RenderModel, interval-selection, and precise-bounds consumers are told the family-plus-transform contracts now report `scaleType/type/kind: "linear", transform: "log10"` with no trained `"log"` type; codemod evaluation is recorded as manual-only because canonical normalization already rewrites authored specs;
- ADR for semantic/transformed spaces and binned two-phase behavior. It explicitly cites decision 0013 and records this as a pre-1.0 semantic-correctness exception to its ordinary deprecation-window guidance: no dual staging branch is permitted by the user-set product policy, and the old result was incorrect rather than a supported appearance default;
- capability/agent skill updates generated from checked data; this includes a new cross-validation generator/test that proves every claimed helper exists at package roots, has its alias identity, normalizes to the declared family, and appears in generated docs/agent text rather than merely extending the current hand-authored array. The ledger distinguishes accepted authored aliases (`type: "log"`) from canonical scale families (`linear`, `time`, `band`, `binned`) and transform capabilities (`identity`, `log10`, `sqrt`);
- changeset for spec/core/Svelte;
- eval 49 and packed-consumer compile/render; eval 49 must combine log10 with at least smooth/bin/density so it exercises staging. Existing log scatter/sequential eval inputs remain unchanged while expected render goldens are intentionally regenerated for the new expansion/staging contract; eval prompt/model vocabulary is regenerated for canonical `transform`;
- `artifacts/scale-equivalence/pr3-position-transforms/` with canonical spec, semantic stage trace, ggplot2 R output, ggsvelte output, light/dark screenshots at 320/640/1200, overlap metrics, browser verification, performance, dependency-size delta, and explained parity differences.

Browser QA checks console, axis title/full-label accessibility, responsive overlap, source tooltip values, brush zoom domains, and visual parity. Baselines publish only after source merge through `/approve-visuals`; this feature PR never commits `tests/visual/__screenshots__/`.

## Review and shipping gates

1. Independent Grok and Claude plan reviews must both return PASS after every P0/P1/P2 finding is fixed or rebutted with evidence.
2. Implement with focused red tests first and retain red/green command evidence.
3. Independent Grok and Claude full-diff reviews must both return PASS; every finding gets a ledger entry and P0/P1/P2 blocks opening the PR.
4. Run repository checks and pre-commit/pre-push hooks.
5. Open PR 3 against `main`.
6. PR 4 branches from PR 3 head and targets the PR 3 branch, per the user-approved stacked delivery. PRs 5–8 repeat against their immediate predecessor.

## Deferred to the remaining stack

- PR 4: public post-stat `coord_transform`, projector, tessellation, semantic anchors.
- PR 5: generic non-position scale engine and color/fill families plus colorbar/colorsteps.
- PR 6: mapped size/linewidth/alpha repair plus shape/linetype.
- PR 7: public responsive guide appearance/merge/layout API.
- PR 8: `coord_fixed`, final evidence board, migration/release audit.
