# #1471 follow-up: truthful peer updates and the next measured wins

Status: executed. Every attack received its own Grok review before code.
Issue: [#1471](https://github.com/ljodea/ggsvelte/issues/1471)

## 1. Initial investigation result (superseded by Attack 0)

PR #1662 replaced the lean SVG adapter's full string render + DOM swap with
`mountSceneSvg`, cutting dense update cost. It deliberately left two jobs for a
follow-up: repair the LayerCake fixture and measure/adopt the faster path through
the public Svelte component.

The current competitive scoreboard still cannot decide the remaining gaps.
On current `main`, two alternating perturbed datasets produce byte-identical
output for all sampled LayerCake paths:

| peer path          | mutation probe                   | result    |
| ------------------ | -------------------------------- | --------- |
| SVG scatter 10k    | first 30 `cx`/`cy`/`fill` values | identical |
| SVG line 3x10k     | all path `d` values              | identical |
| canvas scatter 10k | canvas `toDataURL()`             | identical |

Attack 0 disproved the initial mixed-boundary diagnosis. A diagnostic context
store received successive values. The actual problem was the generator:
`y' = 0.9y + constant` is affine, so retraining a linear domain maps every
value back to the same pixel. Rotating ordinal labels together with an
encounter-ordered inferred domain can preserve colors too. Byte-identical
output was not evidence of a no-op; the original public `setRows()` path works
once variants contain a non-affine component.

A focused current-main run (Chromium, 11 samples per cell) is recorded only as
an absolute ggsvelte baseline because the LayerCake ratios are void:

| cell              | ggsvelte SVG total/sync | ggsvelte canvas total/sync |
| ----------------- | ----------------------: | -------------------------: |
| scatter-color-10k |         161.6 / 68.7 ms |             46.1 / 14.0 ms |
| line-3x10k        |         103.8 / 34.4 ms |             98.3 / 14.2 ms |

The machine was under load, so decisions use repeated same-machine A/B ratios,
not those absolute values.

## 2. Common experiment contract

Every experiment starts from the same commit and runs in isolation. Do not
stack candidates while measuring them.

1. Fix and lock the mutation invariant in Attack 0 first.
2. Record five fresh-process baselines for
   `ggsvelte-svg,ggsvelte-canvas,layercake,layercake-canvas` over
   `scatter-color-10k,line-3x10k`.
3. For each runtime attack: implement on top of Attack 0 only, run its focused
   tests, then record five fresh-process runs with the same lib/case order.
4. Revert the runtime attack before starting the next one. Keep its commit or
   patch available for the final lock-in pass.
5. Compare median-of-run-medians for total and sync time, plus the per-run
   ggsvelte/peer ratio. Treat a change inside 5% or with mixed direction in
   three or more runs as noise.
6. Lock a candidate only when it improves at least one target by >=8% median,
   does not regress another target by >5%, passes parity/correctness tests, and
   does not enlarge an unrelated public bundle entry.
7. After every candidate has been measured alone, compose all winners, rerun
   the five-process matrix, and keep only wins that survive composition.

Public test seams are fixed up front:

- competitive `handle.update(data)` must visibly mutate to the expected second
  dataset without remounting the root;
- `mountSceneSvg.update(scene)` must remain DOM-identical to a fresh render;
- `<GGPlot>` data-prop updates must preserve public DOM, accessibility,
  interaction, and callback behavior.

## 3. Attack 0: make the peer benchmark perform real updates

### Problem

The scoreboard had no output-mutation gate, and its affine-only variants could
remain visibly identical after automatic scale training. That made a real
update indistinguishable from a no-op and invalidated peer conclusions.

### Plan

1. Replace affine-only variants with a deterministic index-dependent wave
   while preserving row count and series topology. Unit-test that both y
   profiles remain different after min/max normalization.
2. Keep each adapter's existing public update seam, including LayerCake's raw
   wrapper state and exported `setRows()`; the proposed proxy/bridge was
   measured, shown unnecessary, and removed.
3. Put the gate and timer through one update contract: call the adapter update,
   then await the harness's existing double-rAF `afterPaint()`.
   Canvas peers that schedule another draw tick must expose/await that tick in
   both paths; the gate may not wait longer than the benchmark.
4. Add an update-parity API with the exact sequence: mount initial data and
   await paint; assign variant 1 and await paint; snapshot; assign variant 2 and
   await paint; snapshot; fresh-mount variant 2 and await paint; snapshot. The
   existing perturbation changes every y value, so every supported scenario
   must change visible marks between variant snapshots.
5. Define renderer-specific output:
   - SVG: canonicalize the full tree by replacing per-mount `id` values and
     matching URL references with deterministic document-order placeholders;
     compare canonical trees for fresh-final parity and separately require
     scenario mark attributes (`cx`/`cy`/paint, path `d`, rect geometry/paint)
     to change between variants.
   - Canvas: hash the exact `getImageData()` pixel buffer after paint; require
     variant hashes to differ and final updated/fresh hashes to match. Do not
     compare `toDataURL()` metadata.
6. Run this gate for every update-capable peer in the default matrix, not only
   LayerCake, before collecting timing samples. A peer that fails mutation or
   final-output parity makes the benchmark fail.
7. Re-run the focused matrix five times. These results become the common
   baseline for Attacks 1-3; refresh `knownGaps` only after runtime experiments.

### TDD and verification

- RED: the browser gate proves affine LayerCake variants are visibly identical,
  exposing the invalid mutation invariant.
- GREEN: non-affine variants make SVG attributes/path data and canvas pixel
  hashes differ; canonical updated output equals a fresh final-data mount
  through the same update/paint-wait contract the timer uses.
- Run Svelte autofixer on every changed `.svelte`/`.svelte.ts` file.
- Run competitive scenario tests, focused Playwright mutation/parity tests,
  and the five-process baseline.

### Risks and kill criteria

- Do not deep-proxy 10k/30k row arrays; existing wrapper state stays raw.
- Do not change LayerCake chart semantics, scales, padding, or rendering code.
- If reactive props still do not cross LayerCake's legacy boundary, use the
  smallest public LayerCake-supported remount/update mechanism and report it
  honestly. Never restore a no-op timing path.

## 4. Attack 1: measure and privately cache data-independent setup

### Problem

`runScene` and `runPipeline` call `setupPipelineRun` on every data-only update,
but current performance marks begin at bind. The cost of normalization,
structural/temporal gates, edition resolution, theme resolution, and coord-flip
resolution is therefore unknown. Data binding, domains, scales, layout, and
geometry must still run because the benchmark changes values and domains.

### Plan

1. Instrument `setupPipelineRun` with a `ggsvelte:setup` performance mark, then
   collect its cost beside bind, scales, layout, geometry, pipeline, update
   sync, and update total for both lean adapters and both dense cases.
2. Spike one private memo of `PipelineRunSetup` inside the two lean adapters,
   or behind an internal `preparePipelineRun` option keyed by their existing
   stable named-data spec. Do not add `createSceneSession`, a headless export,
   or any other public API for the experiment.
3. Cache only setup's normalized spec, edition defaults, theme, and coord-flip
   result. Do not call it a binding plan and do not cache `LayerBinding`, source
   tables, type/parser decisions, `binExtent`, facet panels, scale identity,
   layout, geometry, scene, or layer backends.
4. Every run creates fresh warnings/advisories, run id, tables, domains, scales,
   layout, geometry, scene, and layer backends. If setup produced an edition
   warning, copy it into the new warning array rather than sharing the array.
   `prevScales` and row filters stay ordinary per-run inputs.
5. Limit the spike to the adapters' immutable, stable named-data specs. Spec
   replacement or edition-option replacement takes the cold path; width,
   height, row count, constructors, and data values do not invalidate setup
   because their dependent stages still rerun. Never reuse a normalized inline
   spec that retained old data columns.
6. Measure before adding broad parity coverage. If the private spike earns the
   lock threshold, add differential tests only for the fields actually cached,
   including fresh warnings and spec/edition replacement, before keeping it.

### Benchmark and lock criterion

Use five fresh-process runs and report setup vs bind vs pipeline alongside
end-to-end total/sync time. A cache that only saves sub-millisecond setup but
adds branches is killed in full, including experimental instrumentation. Lock
only if it meets the common >=8% target in at least one dense cell and stays
within 5% in the others. A passing private seam can be deepened later; the
benchmark adapters do not justify a public session contract by themselves.

### Risks

- `normalize` retains `data`/`datasets` references, so the cache is safe only
  for the lean adapters' named-data spec whose data arrives per run.
- Stale inferred types, scale decisions, warnings, or facet layout are worse
  than a small speedup; all remain uncached.
- Keep the lean headless graph lean and preserve disposal ownership.

## 5. Attack 2: replace SVG point `setAttribute` writes with faster DOM setters

### Problem

After #1662, dense scatter updates spend most remaining synchronous time in
10k `cy` writes plus changed color writes. Raw compares already skip unchanged
`cx`/`r`; pipeline work is second-order. Chromium may parse numeric strings and
dirty style more cheaply through SVG animated-length properties or CSS/DOM
properties than through `setAttribute`.

### Plan

1. Rank setters with a browser-only scratch microbenchmark beside the live-SVG
   tests. Mount the same 10k-circle tree, alternate the real perturbation
   values, and randomize candidate order in one page. Do not make 10k-circle
   timing a default CI assertion.
2. Compare write-loop sync and paint-inclusive double-rAF time in Chromium,
   Firefox, and WebKit for:
   - current `setAttribute("cy", px(v))` and `setAttribute("fill", value)`;
   - `setAttributeNS(null, ...)` as a null-namespace control;
   - rounded `circle.cy.baseVal.value`, `valueInSpecifiedUnits`,
     `newValueSpecifiedUnits(SVG_LENGTHTYPE_NUMBER, rounded)`, and
     `valueAsString = px(v)`;
   - cached `getAttributeNode("cy" | "fill").value` using the emitter strings;
   - CSS `style.fill` and CSS `style.cy` as paint-only controls that cannot
     qualify because they change serialization.
     Every numeric candidate uses the same two-decimal rounding as `px()`.
3. A setter is eligible only if all three engines reflect
   `getAttribute("cy") === px(v)`, keep paint in the `fill` attribute, produce a
   tree `isEqualNode`-equal to a fresh render, and preserve zero mutations for
   unchanged `cx`/`r`. Probe support once per mount, never inside the mark loop.
4. If an eligible setter also wins paint-inclusive microbenchmark time, spike
   it only for fill-mode circles in `patchPoints`. Keep `setAttribute` + `px()`
   for other tags, stroke-mode circles, and engines that fail the probe. Do not
   change the string renderer to accommodate a DOM-setter serialization.
5. Run the full live-SVG parity/mutation suite and the five-process Chromium
   competitive matrix on top of Attack 0. The scratch microbenchmark ranks
   candidates; only `live.update` end-to-end results can lock one.

### Kill criteria and risks

- Lock only if Chromium competitive median improves a target by >=8%, no other
  target regresses by >5%, and Firefox/WebKit paint-inclusive microbench time
  regresses by no more than 5%.
- Kill if the win is write-loop-only, Chromium-only, serialization-breaking,
  or requires extending beyond fill-mode circles.
- A lower sync number with equal/worse total time is not a win.
- Do not defer writes across frames; the benchmark measures visible completion.

## 6. Attack 3: profile and remove `<GGPlot>` presentation wrappers

### Problem

The public Svelte renderer materializes a `Point` object per mark, then
`presentationOrder()` materializes a second `{ item, focused }` wrapper per
mark before the keyed each-block. In the common `focusMask === null` path,
order never changes and every wrapper is disposable work. The wrappers may be
too small a share of total update cost to matter, so a profile must precede any
Batch edit. This path is not represented in the browser scoreboard.

### Plan

1. Reuse the existing `ggsvelte-ggplot` id for an opt-in browser adapter; do not
   add a second Svelte id or enable it in the default peer matrix. Load it only
   when selected so peer pages do not pay its package/heap cost. Mount public
   `<GGPlot>` with Attack 0's reactive raw rows and the same `flushSync()` plus
   `afterPaint()` contract. Use a named-data spec to match lean marks. Gate
   mutation and fresh-final parity before changing `Batch.svelte`.
2. Establish five-process self-baselines for scatter 1k/10k, line 3x1k/3x10k,
   area, and bars. Record mount and update. Profile scatter-color-10k into
   pipeline, `Point[]` derivation, `presentationOrder`, each-block, and chrome.
   Kill the Batch edit if wrappers are not on a plausible >=8% path; scatter is
   the target while line/area/bars are regression guards.
3. If the profile qualifies it, retain one keyed each-block and one copy of the
   mark markup. Bypass `presentationOrder()` when `focusMask === null` while
   keeping `(point.index)` keys. When a mask is present, preserve today's
   reorder, mute, and `(item.index)` keys. Applying, inspecting through, and
   clearing a focus mask must preserve the same mark nodes.
4. Do not pursue typed-array/index projection in this attack. Svelte copies
   non-Array iterables for `{#each}`, and a deeper `Point[]` redesign is a
   separate attack only if profiling later proves it is the remaining cost.
5. Verify one `onrender` per `flushSync` update without root remount; mapped
   shape/style swaps; existing focusable-limit tests; legend apply/inspect/
   clear node identity; SSR/hydration; the unchanged canvas `MarkStrata`
   sandwich order; DOM/a11y parity; and the GGPlot treeshake graph.

### Lock criterion and risks

- Self-compare public `<GGPlot>` only. Lock if a dense update improves >=8%,
  mount and every other GGPlot cell stay within 5%, public behavior passes, and
  the GGPlot treeshake graph remains below 1,100,000 raw bytes. Do not add a
  competitive budget key until the candidate locks.
- The single keyed block must preserve node identity when a focus mask is
  applied, active, inspected through, and cleared.
- Do not replace Svelte-owned DOM with the core imperative patcher in this
  attack; hydration and interaction ownership make that a separate design.

## 7. Explicitly rejected attacks

- Dense scatter as one multipoint path: changes per-point hit targets,
  accessibility, styles, and DOM semantics. It is a new render mode, not an
  update optimization.
- Dirty-strata canvas skipping: both benchmark perturbations change every row,
  so every current stratum is dirty.
- Deferred/rAF writes: improves synchronous return by moving work past the
  stopwatch; paint-inclusive completion does not improve.
- Partial domain/layout reuse without invalidation proof: domains move on every
  benchmark update and stale guides are a correctness bug.

## 8. Final lock-in and ship

After all three runtime attacks have been measured alone, compose Attack 1 and
Attack 2 winners on top of Attack 0 and rerun the five-process lean matrix. A
qualifying Attack 3 winner ships in the same change only after its separate
five-process GGPlot table survives the final tree; it is never scored against
the lean/peer matrix. Run full update parity, unit/browser suites, package
checks, type contracts, bundle measures, and competitive budgets. Remove only
`knownGaps` whose repaired peer comparisons now pass. Keep any real gap
issue-tracked with measured notes. Open one Conventional Commits PR with
before/each-angle/final benchmark tables, then shepherd it through fresh-head
review and merge.

## 9. Experiment results

### Common five-process baseline

Median of five fresh-process medians after the non-affine update repair:

| path             | scatter total/sync | line total/sync |
| ---------------- | -----------------: | --------------: |
| ggsvelte SVG     |     60.2 / 23.1 ms |  24.3 / 15.5 ms |
| ggsvelte canvas  |      19.1 / 5.3 ms |   39.2 / 5.9 ms |
| LayerCake SVG    |     95.2 / 63.1 ms |  32.6 / 23.9 ms |
| LayerCake canvas |      19.5 / 7.5 ms |   40.4 / 9.0 ms |

### Attack 1 — killed

`ggsvelte:setup` measured 0.1 ms in every dense cell. Deleting setup entirely
could save at most 1.7% of the fastest sync cell and less than 0.7% elsewhere.
No cache code or instrumentation was retained.

### Attack 2 — killed

Rounded `SVGAnimatedLength` setters cut Chromium write-loop sync time but made
paint-inclusive time worse; Firefox had a 49% total regression on
`baseVal.value`, and WebKit failed emitter-exact serialization. Cached
`Attr.value` was universally exact but flat/slower total. `setAttribute` stays.

### Attack 3 — runtime edit killed; benchmark seam retained

The opt-in public `<GGPlot>` adapter passes mutation/fresh parity and stays out
of default peer pages. At scatter 10k it measured 205.4 ms total / 152.8 ms
sync. `Point[]` projection was 2.9 ms and `presentationOrder()` only 0.2 ms, so
the wrapper removal's theoretical ceiling was 0.13% of sync time. No
`Batch.svelte` behavior change or profiling instrumentation was retained.

### Final cross-peer truth gate

Running mutation/fresh parity across the complete default matrix found two
pre-existing adapter problems that the former timer could not expose:

- ECharts' default option merge retained stale series state. Updates now use
  `replaceMerge: ["series"]`, preserving the chart instance while making the
  final pixels equal a fresh final-data mount.
- The Unovis Svelte wrapper applies changed data with rendering suppressed.
  Its fixtures now trigger the wrapper's container render through a
  row-dependent, non-visual callback config and disable the peer's 600 ms
  transitions so the timed double-rAF contract measures completed output.
  Stacked-bar keys are sorted so categorical identity does not depend on the
  perturbation's encounter order.

Canonical SVG comparison normalizes local and absolute generated-ID
references and ignores zero-opacity transition exit nodes. Canvas comparison
uses pixels alone, not renderer-owned DOM metadata. With those rules, all 68
default browser cells mutate and reach fresh-final parity. No runtime core or
Svelte package optimization survived the three attack thresholds; the locked
wins are the truthful gate, the repaired peer adapters, and the opt-in public
`<GGPlot>` measurement seam.

The ratchet removed four stale #1471 exemptions: dense SVG scatter versus
LayerCake and Unovis, plus dense SVG line and dense Canvas line versus
LayerCake. The Canvas decision uses the common five-process result (39.2/5.9
ms versus 40.4/9.0 ms total/sync), not a favorable one-off run. A repeated
five-process check retained one newly truthful short-cell gap: SVG line 3x1k
updates measured 8.9 ms versus LayerCake's 6.4 ms median-of-medians. It remains
issue-tracked rather than being hidden by a wider global tolerance.

The final budget pass also fixed the exemption ratchet itself: it had used the
short-cell tolerance to call gaps closed, producing claims such as
`7.9 <= 5.8`. Exemptions now self-destruct only when ggsvelte wins beyond that
same noise margin; tolerance can pass an unexempted noisy comparison but cannot
erase an issue-tracked gap.

Repeated full-matrix runs also showed total-time ordering flip while the paired
sync ordering stayed stable. The relative CI gate now requires both total and
sync to miss the same tolerance before declaring a new loss. This uses the two
metrics from the same samples to reject frame/compositor drift; it does not
remove total timing or let deferred-render peers pass through a cheap return.
