# 0003 — Two-pass layout + metrics-table measurer (spike M0a-3)

- **Status:** accepted
- **Date:** 2026-07-10
- **Spike code:** `spikes/pure/src/{measure,ticks,layout}.ts`, `spikes/pure/tests/`, `spikes/browser/src/canvas-text.ts`, `spikes/browser/tests/browser/measure-drift.test.ts` (throwaway; decisions below are what M0c builds on)

## Decision summary

1. The canonical deterministic measurer is a **per-character advance-width table** measured once in a real browser at a reference size and scaled linearly. Kerning is ignored by design.
2. The **bounded two-pass layout** (pass A: priors → ticks → measure; pass B: re-derive with pass-A margins; 0.5px convergence check; pass-B wins unconditionally, no third pass) is **confirmed as sufficient**. Margins are quantized up to a 4px grid; per-side caps with thin-then-truncate degradation are implemented and fixture-tested.
3. Measured drift between the canonical measurer and native canvas `measureText` is **max 1.55px / mean 0.075px** on a 59-label realistic corpus at 10–14px, always in the safe (wide) direction, and **4px margin quantization absorbs 99.3% of it** (the rest is off by exactly one quantum, never more).

## 1. Measurer format

```ts
interface TextMeasurer {
  measureWidth(text: string, fontSizePx: number): number;
  measureHeight(fontSizePx: number): number; // ascent + descent
}

interface MetricsTable {
  fontStack: string; // must equal DEFAULT_FONT_STACK ('Helvetica, Arial, sans-serif' in the spike)
  refSize: number; // 100 (px) — advances measured at this size
  ascent: number; // fontBoundingBoxAscent at refSize
  descent: number; // fontBoundingBoxDescent at refSize
  defaultAdvance: number; // fallback for uncovered chars (width of '0')
  advances: Record<string, number>; // char → advance px at refSize
}
```

- `MetricsTableMeasurer.measureWidth` sums per-code-point advances and scales by `fontSizePx / refSize`. Linear scaling is exact for canvas text in Chromium (no hinting); verified by the drift test.
- **Kerning is ignored** (documented contract). Kerning in real shaping only ever _tightens_ Helvetica text, so the canonical measurer errs wide: margins come out marginally generous and labels are never clipped. The drift test asserts `native − table < 0.5px` across the corpus (observed max: 0.0000px).
- **Coverage:** ASCII 32–126, printable Latin-1 (0xA0–0xFF), and common label typography (en/em dash, curly quotes, ellipsis, U+2212 minus, thin space, ≤ ≥, €) — 203 glyphs. Anything else falls back to `defaultAdvance` (width of `'0'`), which is where real drift lives (see §3).

### Generation workflow (repeat in M0c on the pinned container)

1. `cd spikes/browser && bunx vitest run --project browser -t "generates the metrics table"`
2. Copy the JSON between `__METRICS_TABLE_START__` / `__METRICS_TABLE_END__` in the output into `spikes/pure/src/font-metrics.ts` (in M0c: the core package's generated constant, with a small emit script instead of copy-paste).
3. The browser suite's "checked-in table matches a fresh measurement" test then guards staleness: every advance is re-measured and compared at 0.05px — a hand-edited or outdated table fails on the generating environment.

The table is **environment-specific** (it encodes whichever font the stack resolves to). The spike table was generated on macOS Chromium (Helvetica). The production table must be generated **inside the pinned Playwright container**, or better, against a **self-hosted font** (already planned for VR determinism) so the table is identical everywhere.

## 2. Layout algorithm (as validated)

```text
layout(input):
  passA = layoutPass(theme.marginPriors, input)
  passB = layoutPass(passA.margins, input)
  converged = max per-side |passB.margins − passA.margins| ≤ 0.5px
  return passB (+ converged flag)            # NO third pass, ever

layoutPass(margins, input):
  innerW/H   = plot size − margins (floor 1px)
  tickCount  = clamp(round(inner / targetPxPerTick), 2, maxTicks)   # ← range feedback
  ticks      = niceLinearTicks(domain, tickCount) | band categories
  labels     = formatter(tick, step)          # default: step-derived decimals, en-US grouping, e-notation ≥ 1e18
  cap[side]  = floor(maxMarginFraction × dimension / quantum) × quantum
  if required margin > cap:                   # degrade, in order:
    1. tick thinning   (linear: halve tick request; band: double labelEvery) while it helps
    2. truncation      (ellipsis, binary-shrink to cap − tick − gap), recorded in result
  left   = max(minLeft,  widestYLabel + tickLen + gap)   capped, quantized UP to 4px
  bottom = max(minBottom, labelHeight + tickLen + gap)   capped, quantized
  right  = max(minRight, lastXLabelWidth / 2)            capped, quantized   # centered-label overhang
  top    = max(minTop,   labelHeight / 2)                capped, quantized
```

- **Empty domains** (NaN linear, zero categories): no ticks, floor margins, `*:empty-domain` degradation tag, converges trivially.
- **Degenerate linear domain** (min == max): single tick at the value.
- **Rotation:** intentionally not implemented (spike scope cut; revisit only with a concrete need — thinning + truncation covered every fixture).
- Quantization serves double duty: it absorbs measurer drift (§3) **and** stabilizes A→B (margins move in whole quanta, so sub-quantum measurement wobble cannot flip tick counts).
- Key safety property (asserted in the sweep): **final margins are computed from the final tick labels**, so whatever pass B chose, its labels fit. Stopping at two passes can only cost tick _density_ accuracy, never overflow.

## 3. Measured drift (canonical vs native canvas)

Corpus: 59 realistic tick labels (grouped/huge/decimal/negative/currency numbers, dates/times/quarters, category names incl. accents) × sizes 10–14px = 295 measurements, Chromium headless, macOS, Helvetica.

| Metric                                            | Value                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Max abs drift                                     | **1.5518px** (`"Total revenue"` @ 14px — kerning; native 84.055 vs table 85.606) |
| Mean abs drift                                    | **0.0747px**                                                                     |
| Max drift in unsafe direction (native > table)    | **0.0000px**                                                                     |
| Absorbed by 4px margin quantization (same bucket) | **293/295 = 99.3%**                                                              |
| Off by exactly one 4px quantum                    | 2/295 (never more)                                                               |
| Assertions gated in CI-able test                  | max < 2.0px, mean < 0.25px, unsafe < 0.5px, absorption > 95%                     |

Fallback (characters outside the table, reported but not gated): up to **9.35px** on `"10⁻⁷"` @ 14px (superscripts), ~3.9px on `"CO₂"`. Conclusion: within table coverage drift is sub-2px and one-sided; the risk lives entirely in coverage gaps.

**Verdict on quantization:** yes — 4px margin quantization absorbs the canonical/native drift for covered text. The residual worst case is one quantum, which is exactly the granularity the escape hatch (`margins` override) and the measurement contract (per-measurer Scene equivalence, never cross-measurer) already allow for.

## 4. Is two passes enough? Does the tick-count feedback destabilize?

Randomized sweep (seeded, N=500: sizes 90–890 × 70–620, linear domains spanning 1e-5…1e15, band domains 2–12 categories):

- **A→B converged (≤0.5px): 98.4%.**
- Hypothetical pass C would move margins in **0.4%** (2/500) of fixtures, worst case **48px**.
- When A→B converged, pass C is **bit-identical** to pass B (asserted per fixture) — quantized margins are either equal or ≥1 quantum apart, so the 0.5px check effectively means "equal", and equal inputs re-run deterministically.

The two moving cases are a genuine **period-2 oscillation**, not noise: with huge-number domains, changing the inner width changes the tick count, which changes the _last x label_ between `"0"` and a 19-char grouped number (e.g. `"20,000,000,000,000"`), flipping the right margin between 4px and 52px forever. No third pass fixes this — it alternates. `pass-B wins` truncates the cycle safely because of the §2 safety property (pass-B margins fit pass-B labels by construction); the only cost is tick density up to ~±1 tick off target.

**Verdict: two passes with the 0.5px rule and 4px quantization are enough. Keep the rule exactly as specced.** The feedback loop can oscillate in adversarial fixtures but cannot produce clipped labels or unbounded margins, and quantization makes the convergence check exact in practice.

## Guidance for M0c

1. **Ship the measurer interface + table format as-is.** Generate the production table in the pinned Playwright container against the self-hosted font; add an emit script (test prints JSON → file) instead of copy-paste, and keep the staleness-guard test in the browser suite.
2. **Extend table coverage before extending formatters.** The only >2px drift came from uncovered glyphs (superscripts, Greek). If a default formatter ever emits `×10ⁿ` notation, add those glyphs to the table first.
3. **Keep quantum = 4px** and quantize margins up. It buys drift absorption and pass-loop stability at negligible visual cost.
4. **Reduce (don't chase) the oscillation source:** the 48px flip comes from the last-x-label width being wildly value-dependent. A formatter that switches to SI/e-notation by _axis step_ (not per value) shrinks huge-number labels axis-wide and removes most of the flip amplitude. Nice-to-have, not required for correctness.
5. **Degradation order (thin → truncate) held up** in fixtures; record degradations on the result (`x:thin`, `y:truncate`, `*:empty-domain`) so `validate()`/DataProfile can surface them to agents.
6. **Tooling notes** (spike environment, relevant to M0b scaffold):
   - `spikes/browser/vitest.config.ts` uses the vitest-3 string form `provider: 'playwright'`; vitest 4 removed string providers (factory import from `@vitest/browser-playwright` required). The spike pinned `vitest`/`@vitest/browser` to `^3.2.4` (and `@sveltejs/vite-plugin-svelte` to `^5`) to match the config rather than modify it. M0b must pick one: vitest 4 + factory-provider config, or stay on 3.2.x.
   - This dev machine runs an x64 (Rosetta) shell with an arm64 bun: bun installs arm64-only native bindings (`@rollup/rollup-darwin-arm64`, `@esbuild/darwin-arm64`) that x64 node can't load. The x64 binding packages were placed manually under `node_modules/.bun/{rollup@4.62.2,esbuild@0.28.1}/…`; a fresh `bun install` removes them. Either run vitest with an arm64 node or re-place the x64 bindings. The pinned CI container makes this a non-issue in CI.
