# #1471 — In-place updates without full re-renders: angles of attack

Status: DRAFT for cross-model review (grok + codex) before any code.
Issue: [#1471](https://github.com/ljodea/ggsvelte/issues/1471) (reopened; five knownGaps
exemptions in benchmarks/competitive/budgets.json hang off it).

## 1. What the harness measures

`benchmarks/competitive` mounts each lib once per cell (untimed), then times
`handle.update(data)` paint-inclusive (double-rAF total + synchronous phase).
Data alternates between two deterministic perturbations of the mount dataset:
same column shape, same row counts, different values — so domains DO move and
axes legitimately recompute. No lib can no-op.

Current ggsvelte update paths (adapters are deliberately honest):

- `adapters/ggsvelte-svg.ts`: rebuild SpecInput → `renderToSVGString` →
  `replaceChildren()` + `innerHTML = svg`. Full re-render + full DOM swap.
- `adapters/ggsvelte-canvas.ts`: `runPipeline` → `planStrata` → `clearRect` +
  `drawStratum` on the same canvas. Full pipeline re-run, full marks redraw.

## 2. Measured attribution (this worktree, Chromium via Playwright, median of 21)

unthrottled frames, sync phases only — no double-rAF paint included)

| cell               | update total |    renderToSVGString |   innerHTML swap | pipeline | bind | scales | layout | geometry |
| ------------------ | -----------: | -------------------: | ---------------: | -------: | ---: | -----: | -----: | -------: |
| svg scatter-10k    |       32.5ms |      6.4ms (emit ≈4) |       **25.8ms** |    2.3ms |  0.8 |    0.5 |    0.2 |      0.4 |
| svg line-3x10k     |       12.4ms | **10.3ms** (emit ≈6) |            1.9ms |    4.4ms |  1.7 |    1.0 |    0.1 |      1.4 |
| svg bars-50x4      |        2.0ms |                1.0ms |            1.0ms |    0.7ms |    — |      — |      — |        — |
| canvas scatter-10k |        4.5ms |    runPipeline 2.3ms | clear+draw 2.1ms |        — |  1.1 |    0.5 |    0.1 |      0.4 |
| canvas line-3x10k  |        5.3ms |    runPipeline 4.8ms | clear+draw 0.5ms |        — |  1.8 |    1.0 |    0.1 |      1.5 |

Cross-checks against issue numbers (#1649 paired run): canvas line-3x10k sync
6.5ms reported vs 5.3ms measured here — matches. SVG scatter sync 52.6ms
reported vs 32.5ms here — same shape (swap-dominated), different machine/run.

Conclusions:

1. **svg scatter-10k loss is a DOM-swap loss**, not a pipeline loss. 802KB of
   SVG string → re-parse + insert ~10k nodes = 25.8ms sync, plus full-subtree
   style/layout/paint on the async side. Pipeline is 2.3ms of a ~90ms total.
2. **svg line-3x10k is string-emission-heavy**: ~6ms building `d` strings for
   30k vertices + full-document serialization; the swap itself is cheap (3
   path nodes, 1.9ms).
3. **canvas cells already win sync** (issue: 6.5 vs 10.8). The canvas total
   loss is paint/compositor-side (45.9 vs 36.9 total with sync won). "Redraw
   only dirty strata" cannot help these cells: the harness perturbs the full
   dataset, so every mark batch is dirty by construction.
4. bars-50x4 is small everywhere (2ms sync); the gap (7.3 vs 4.2 total) is
   mostly fixed-cost teardown/recreate + paint.

## 3. Angles of attack

### Angle 1 — Live SVG scene patcher (morph, not string + innerHTML)

New lean entry (working name `@ggsvelte/core/svg-live`, keeping
`@ggsvelte/core/dom` canvas-only so the svg adapter's lean bundle story is
unchanged):

```ts
const live = mountSceneSvg(root, scene, opts); // builds real DOM once
live.update(nextScene); // patches in place
live.destroy();
```

Update algorithm:

- Reconcile structurally: panels by index; within a panel, batch `<g>` nodes
  keyed by `(layerIndex, batch ordinal)`; marks patched **positionally**
  (geometry batches are dense typed arrays with stable row order across
  same-shape updates).
- Attribute-level writes, compare-before-write using the same `px()` /
  formatting as the string renderer so unchanged values never call
  `setAttribute` (a same-value write still dirties the node).
- Path marks: rebuild only that path's `d` via the existing `pathData` fast
  path; one `setAttribute("d", …)` per path. Skips whole-document string
  serialization and re-parse entirely.
- Chrome (axis ticks, grid lines, labels, titles) patched positionally the
  same way; legend entries keyed by raw domain value.
- Enter/exit only when counts differ (document order preserved by inserting
  before the positional successor).
- Defs (gradients/glow) keyed by paint id; only created/removed on set change.

Parity risk and mitigation: the patcher must mirror `sceneToSVGString`
structure (same elements, classes, attribute names). Mitigation: property
test — mount, update across both perturbation datasets, then assert
`serialize(liveRoot)` deep-equals `sceneToSVGString(currentScene)` (attribute
order normalized). Run over the four competitive scenarios plus faceted and
legend-heavy gallery specs.

Expected: scatter-10k sync 32.5 → ~5–9ms (pipeline 2.3 + attr patching);
line-3x10k 12.4 → ~7ms (pipeline 4.4 + `d` rebuild ≈3, skipping 6ms doc
serialization + swap); bars-50x4 → ~1.5ms. Async paint should also drop
(attribute changes on same nodes vs full subtree teardown), which is where
the remaining total-time gap lives.

The svg adapter switches to: mount → `mountSceneSvg`; update → `runScene`
(same spec, new data) + `live.update(scene)`. This is a real library API, not
a benchmark trick: any non-Svelte consumer (React/vanilla/SSR-hydration) gets
the same in-place path.

### Angle 2 — Pipeline session reuse (incremental planning)

`runPipeline`/`runScene` gain an optional session handle:
`createPipelineSession(spec, options)` → `{ run(data) }`, caching across runs:

- normalized spec, resolved theme, edition defaults (spec object unchanged
  across data-only updates — the adapter already builds the portable once for
  canvas; svg adapter would do the same);
- field-type / lean-parse decisions per column when the column "shape
  signature" (constructor, length, first-cell typeof) matches — skips the
  O(n) typeof walks in `bind`;
- scale registry + scale object identities; retrain domains only (data moved,
  so domain training itself is NOT skipped — only the setup around it);
- tick-count / layout-skeleton reuse: panel rects are recomputed (axis label
  widths can move with domains), but the measurer and grid structure are
  cached.

Expected savings from profile: setup+parts of bind+scales ≈ 0.8–2ms per
update depending on cell. Does NOT close scatter-10k alone (swap dominates);
composes with Angle 1 and directly extends the canvas line-3x10k sync win
(pipeline 4.8 → ~2.5–3ms).

Honesty note: this is the "incremental update plan" the issue text asks for,
but measured impact is second-order behind Angle 1 for SVG. Implement after
Angle 1, keep only if benchmarks show a real additional win.

### Angle 3 — Canvas paint-side parity (line-3x10k total loss)

The canvas sync phase is already won; the total loss (~46 vs ~37) is
paint/compositor-side. Before writing code, trace one update (Chrome
performance trace / layer stats) to attribute the async side. Hypotheses, in
order of prior probability:

a. **Redraw scheduling**: clearRect + full stroke in the timed sync phase may
serialize rasterization into the measured frame, while LayerCake's
`$effect` redraw lands differently in the frame pipeline. Test: defer draw
to rAF inside update (sync drops, total unchanged?) vs current.
b. **Backing-store / canvas size**: verify identical canvas pixel dimensions
and DPR handling vs the LayerCake canvas fixture; a larger backing store
costs upload+composite per frame.
c. **Stroke geometry**: 3×10k-segment polylines rasterize differently with
different lineJoin/width/dash state; check parity with the fixture.
d. **Dirty-strata skipping**: explicitly expected ~zero for these cells (full
dataset perturbation ⇒ all strata dirty). Implement only if (a)–(c) dead-
end AND the generic partial-update story wants it.

Lock in only a measured fix; otherwise keep the cell exempted with a note
that sync is won and the residue is paint scheduling.

### Angle 4 (considered and rejected) — Harness-level changes

The harness is fair (same double-rAF, same data, fresh page per cell). No
changes. Not an angle.

## 4. Sequencing and win-locking

1. Baseline: `COMPETITIVE_LIBS=ggsvelte-svg,ggsvelte-canvas,layercake,
layercake-canvas,unovis COMPETITIVE_CASES=scatter-color-10k,line-3x10k,
bars-stacked-50x4 bun run measure:browser` on main — record the five
   exempted cells (total + sync).
2. Angle 1 implementation + parity tests → re-run the same cells → lock in if
   relative gate passes without mount regressions.
3. Angle 2 → re-run → lock in only if it adds a measurable win over Angle 1
   alone.
4. Angle 3 trace → targeted fix if found → re-run → lock or document.
5. Remove the closed cells' `knownGaps` entries from budgets.json (the gate
   fails on stale exemptions — removal is mandatory, not cosmetic). Keep any
   cell still genuinely lost, with an updated note.
6. Unit tests (patcher parity, session reuse correctness), oxlint + repo
   checks, full `check-budgets.ts`, PR, shepherd to merge.

## 5. Acceptance

- `benchmarks/competitive/check-budgets.ts` passes with the #1471 knownGaps
  removed for every cell the new paths actually win (target: all four SVG
  cells; canvas cell contingent on Angle 3 findings).
- No absolute-budget or mount-path regressions in results/browser.json.
- Bundle cells unchanged in size class (new entry is a separate export;
  `measure-bundles` / treeshake tests stay green).
- Patcher parity property test committed (Angle 1), session-reuse correctness
  test committed (Angle 2, if kept).

## 6. Cross-model review outcomes (grok-4.5 + codex, 2026-08-19)

Both reviews ran in consult mode against the plan above with repo access.

### Agreed-with corrections (adopted)

1. **Spike before building.** Do a points-only positional `setAttribute` patch
   spike on PERTURBED scatter-10k data (harness `perturbed()`: `y' = 0.9y +
5v`, cls labels rotated — so `cy` and `fill` change for nearly all points;
   compare-before-write saves only `cx`/`r`) before building any general
   reconciler. If attr-patching does not clear the gate math, Angle 1 stops.
2. **Line estimate was optimistic.** `pathData` rebuild is unavoidable; the
   realistic ceiling is runScene + pathData ≈ 7–9ms, not 7ms flat. Emission
   savings are the wrapper serialization (~1–2ms) + swap (1.9ms).
3. **Canvas double-clearRect.** `drawStratum` clears the viewport itself
   (packages/core/src/dom/canvas.ts, documented); the adapter's extra
   `clearRect` is redundant. Remove first, measure, trace only if the total
   gap survives. (Verified in source — both reviewers caught it.)
4. **Positional patching needs a structural signature.** Key batches by
   (panel, layerIndex, kind, ordinal-within-kind); on any signature mismatch
   (counts, element kinds, subpath topology, facet changes) rebuild that
   batch subtree from `renderBatch` string, with whole-scene fallback for
   panel-set changes. Attribute removal is as important as update.
5. **Compare-before-write must not read the DOM.** Cache last formatted
   values in side arrays; `getAttribute` read-back can cost more than it
   saves.
6. **Live defs need per-instance ids** (the string renderer deliberately
   reuses deterministic ids and accepts cross-plot collisions). Parity test
   normalizes ids rather than asserting byte equality.
7. **Gate mechanics sequencing:** inspect results → remove closed exemptions
   → then run check-budgets (stale exemptions fail the gate by design; the
   "re-measure, lock if passes" loop cannot work with exemptions still
   present).
8. **Angle 2 strict invalidation:** cache only data-independent work
   (normalized spec, theme, binding plans) keyed by spec+options identity;
   column shape signature gates lean-parse reuse; any mismatch → cold path.
   Differential tests vs fresh `runScene` across type/domain/facet/size
   changes. Bind/geometry always re-run. First step is just switching the SVG
   adapter to a named-data portable spec built once (mirrors canvas).

### Reviewer disagreements / noted but not adopted

- Codex: add a `ggsvelte-svelte` browser row (GGPlot/SceneView) to the gate.
  Not in this PR: harness expansion is #1486's territory; this PR closes the
  lean-cell exemptions with a real core API. The patcher is a genuine product
  surface for non-Svelte consumers (mirrors `@ggsvelte/core/dom` for canvas).
  GGPlot adoption of the same machinery is a documented follow-up, not
  pretended-away.
- Grok's fifth angle (dense-point representation — single multipoint path
  instead of 10k circles): real product direction, but a rendering-semantics
  change (hit targets, a11y, per-point styles), out of scope for closing
  these cells. Worth its own issue if Angle 1 underdelivers.

### Spike results (filled in 2026-08-19, before Angle 1 implementation)

- [x] scatter-10k positional attr-patch vs innerHTML swap (perturbed data,
      paint-inclusive): patch sync 30.8ms vs full 45.8ms (noisy spike env;
      domwrite alone 27.1ms for 30k setAttribute). Real win, not sufficient
      alone for the gate → chrome re-serialization hybrid + cx skip needed.
- [x] line-3x10k: patch sync 17.7 vs full 24; bars-50x4: 2.1 vs 3.4.
- [x] canvas double-clearRect delta: 0.7 vs 0.6ms — noise-level on sync, but
      the adapter clear is redundant by contract (drawStratum clears).
      Remove as correctness/cleanup, not as a win claim.
- [x] Paint-feature experiments under the REAL harness (single-cell runs,
      same-run ratio vs layercake): per-mark opacity instead of `<g opacity>`
      1.70 vs 1.81 baseline; no shape-rendering 2.13; no clip-path 1.72 —
      all within run noise (layercake control swung 37.9–49.5ms). None of
      these features explains the paint-side gap. Reverted.
- [x] CDP trace of one scatter-10k update: ggsvelte-svg pays 20.03ms
      UpdateLayoutTree (n=2) vs layercake 0.06ms — the full innerHTML swap
      forces a whole-subtree style/layout rebuild that in-place patching
      avoids. This is the async-side cost Angle 1 actually removes.
- Unovis scatter is SVG-per-point via d3 join but defers work past sync
  return (0.8ms sync); its 17.1ms total remains the honest bar and is likely
  out of reach for any SVG-DOM approach at 10k. Expect that exemption to
  stay with an updated note.

## 7. Angle 1 implementation results (2026-08-19, same-machine paired runs)

Implemented: `packages/core/src/svg-live/` (sceneSignature + positional
patchers + mountSceneSvg), svg adapter switched to runScene + live.update,
parity gate (patched DOM ≡ fresh render via isEqualNode) wired into
measure-browser after every ggsvelte-svg cell — PASSED on all four default
scenarios.

| cell              | baseline update (total/sync) | patched update | delta                       |
| ----------------- | ---------------------------- | -------------- | --------------------------- |
| scatter-color-10k | 73.8 / 42.4                  | 66.2 / 31.4    | −7.6 / −11.0                |
| scatter-color-1k  | 12.4 / 5.8                   | 6.8 / 4.1      | −5.6 / −1.7                 |
| line-3x10k        | 40.3 / 18.9                  | 42.2 / 19.9    | noise (d rebuild dominates) |
| bars-50x4         | 5.9 / 2.7                    | 7.1 / 3.1      | noise-level                 |

Bundle entries: 0.0 KB delta (svg-live tree-shakes out of string-render
entries; adapter switch only affects the browser path).

### Harness finding (major): LayerCake peer updates are NO-OPS

CDP trace after Angle 1 still showed 25ms UpdateLayoutTree for our patched
scatter-10k update vs 0.06ms for layercake. Isolation experiment
(trace-attr-loop.scratch.ts): a raw setAttribute loop on LAYERCAKE'S OWN
tree costs 24.7ms — identical to ours — so the cost is 10k-attribute-update
intrinsic, not patcher inefficiency. DOM/pixel probes then showed layercake
SVG scatter, SVG line, and canvas scatter updates NEVER change the mounted
output (identical cx/cy/fill, identical path d, identical canvas dataURL
across perturbation variants): the fixture's `setRows` + `$state.raw` does
not propagate into LayerCake's legacy `export let data` context stores.
LayerCake's "update" numbers (e.g. 46.5ms scatter-10k total) are pure Svelte
row-diffing with zero visual effect. Every vs-layercake update comparison in
this issue is therefore void pending a fixture fix (#1486 territory);
verified-real peers (d3 join 92.2/46.8, tanstack-svelte 149.7/142.4,
svelteplot 827+) all lose to the patched path. Unovis is real (RasterTask
19.7ms in trace) and still wins total — canvas-class rendering.

Angle 2 (named-data portable, adapter-level) and Angle 3 (canvas adapter
double-clearRect removal — drawStratum clears per contract) folded in; the
canvas delta is noise-level as predicted.

## 8. Final numbers (2026-08-19, full all-libs paired run, Chromium medians)

Fast-path refinement after the first pass: per-channel raw compares
(perturbation writes only cy, not cx/cy/r), prev-`d` rebuild skipped for
paths, numeric colorIndexes fill compare. ggsvelte-svg update (total/sync,
baseline → final):

| cell              | baseline    | Angle 1 (AttrMap) | final (fast path)      |
| ----------------- | ----------- | ----------------- | ---------------------- |
| scatter-color-10k | 73.8 / 42.4 | 66.2 / 31.4       | **56.7 / 20.2**        |
| scatter-color-1k  | 12.4 / 5.8  | 6.8 / 4.1         | **9.5 / 3.3**          |
| line-3x10k        | 40.3 / 18.9 | 42.2 / 19.9       | **40.1 / 9.4**         |
| line-3x1k         | 7.3 / —     | —                 | **10.0 / 3.2**         |
| area-3x1k         | 7.4 / 4.7   | —                 | **6.7 / 3.9**          |
| bars-stacked-50x4 | 5.9 / 2.7   | 7.1 / 3.1         | 7.6 / 3.4 (noise band) |

ggsvelte-canvas update (Angle 2 named data was already present; Angle 3
clearRect removal): scatter-10k 33.2 (issue) → **19.8 / 4.9**; line-3x10k
67.7 (issue) → **44.4 / 5.9**; small cells flat.

Budgets re-anchored to ~3x the new medians (was ~4–7x the old ones);
check-budgets green: 11 cells within budget, 56 gated comparisons PASS.
Parity gate (patched DOM ≡ fresh render, isEqualNode) wired into
measure-browser for every ggsvelte-svg cell — PASS.

Verification: 2454/2454 core bun tests, 27/27 new svg-live browser tests
(chromium+firefox+webkit), root `bun run check` green (tsc, type contracts,
lifecycle + docs projections regenerated for the new experimental entry),
oxlint clean, changeset added (minor, @ggsvelte/core).
