# 0006 — Compositing strata + pointer-events model (spike M0a-6)

- **Status:** Accepted (spike proven in real chromium)
- **Date:** 2026-07-10
- **Spike code:** `spikes/browser/src/strata/*` (throwaway), tests `spikes/browser/tests/browser/strata.test.ts`
- **Run:** `cd spikes/browser && bunx --bun vitest run -c vitest.strata.config.ts --project browser -t strata` — 8/8 green in headless Playwright chromium (vitest 4.1.10, playwright 1.61.1, chromium via @vitest/browser-playwright)

## Decision

The plan's round-2 compositing model works exactly as specified and is adopted for M2 canvas work: a positioned plot root `<div>` containing an ordered list of full-size sibling strata (SVG / canvas / SVG), where **document order = paint order** (no z-index anywhere), all strata `pointer-events: none`, and a single transparent event-capture layer on top resolving hits through a plot-pixel-space hit index.

## Proven DOM structure

```html
<div class="gg-plot" style="position: relative; width: {W}px; height: {H}px">
  <svg class="gg-stratum gg-svg-bottom" …>
    <!-- grid / axes -->
    <canvas class="gg-stratum gg-canvas" …>
      <!-- high-count marks -->
      <div class="gg-canvas-a11y" role="img" aria-label="…">
        <!-- off-screen, pairs with canvas -->
        <svg class="gg-stratum gg-svg-top" …>
          <!-- text / legends / tooltip overlay -->
          <div class="gg-capture" …>
            <!-- single event-capture layer, last = topmost -->
          </div>
        </svg>
      </div>
    </canvas>
  </svg>
</div>
```

- Every stratum + capture layer: `position: absolute; inset: 0`, geometrically coincident with the root.
- **No `z-index` anywhere** — stacking is pure document order among positioned siblings. Tests assert `z-index: auto` on all layers and that `document.elementsFromPoint` returns capture → top-SVG rect → canvas → bottom-SVG rect (top-to-bottom = reverse document order).
- SVG strata get explicit `width`/`height` attributes and a `viewBox` of `0 0 W H` so SVG user units are CSS px.

### What "paint order" proof means (and its limit)

SVG pixels cannot be read back, so the proof is composite: (a) canvas `getImageData` at the overlap point shows the canvas fill (canvas painted there); (b) hit-test stacking (`elementsFromPoint` with test-only `pointer-events: auto` on strata) shows top-SVG above canvas above bottom-SVG, and CSS stacking of interleaved positioned siblings without z-index is definitionally paint order. No screenshot comparison was needed.

## Sizing / DPR recipe (proven)

```ts
canvas.width = Math.round(cssW * dpr);
canvas.height = Math.round(cssH * dpr);
canvas.style.width = `${cssW}px`;
canvas.style.height = `${cssH}px`;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // all drawing code stays in CSS px
```

- Proven at the container's real DPR and at simulated `dpr = 2`: a 1-CSS-px vertical line at `x = 10` lands exactly on device columns `[10·dpr, 11·dpr)` with alpha exactly 0/255 at the boundaries (no antialias bleed for integer-aligned geometry).
- Fractional DPR: backing store must be rounded to an integer (`Math.round`), asserted at `dpr = 1.5`. Note for M2: at fractional DPR, 1-CSS-px geometry _will_ antialias (device edges fall mid-pixel); the recipe guarantees correct size/mapping, not crispness — snap to device pixels (`round(v·dpr)/dpr`) where crispness matters (grid lines).
- Use `setTransform` (absolute), not `scale` (cumulative), so re-render after resize can't compound.

## Panel clipping recipe (proven)

One canvas element per canvas stratum; panels are clipped regions inside it:

```ts
ctx.save();
ctx.beginPath(); // load-bearing: clip() uses the current path;
ctx.rect(px, py, pw, ph); // a stale path would union into the clip region
ctx.clip();
drawMarks(ctx); // coordinates in CSS px — the dpr transform carries into the clip
ctx.restore(); // clip fully gone afterwards (asserted by painting the gutter)
```

Asserted via `getImageData`: marks overflowing a panel edge are transparent (alpha 0) in the gutter, painted inside the panel, and drawing works in the gutter again after `restore()`.

## Pointer-events recipe (proven)

- All strata: `pointer-events: none` (style on the `<svg>` root disables its whole subtree; no per-mark work needed).
- Capture layer: transparent `<div>`, `pointer-events: auto`, `touch-action: none`, **last child** of the plot root.
- `document.elementFromPoint` returns the capture layer at every probed point (over an SVG-painted mark, a canvas-painted mark, a top-SVG mark, and empty plot area) — strata never appear anywhere in the `elementsFromPoint` stack, because hit testing skips `pointer-events: none` elements entirely.
- Hit resolution: `clientX/Y − capture.getBoundingClientRect()` → plot-pixel space → hit index (spike: reverse-iterated bbox array, topmost-wins). The correct mark id resolves regardless of which stratum painted it; misses resolve to null. Synthetic `PointerEvent`s dispatched at the browser-hit-tested target confirmed the full path.
- Corollary for tests/tooling: you cannot use `elementsFromPoint` to introspect strata in production DOM — the spike exposes a test-only `strataPointerEvents: 'auto'` knob for that; production code must never ship it.

## Canvas a11y block (sketch proven at attribute level)

- Off-screen sibling `<div role="img" aria-label="…">` immediately after the canvas in document order (a `<desc>` cannot live on a `<canvas>`).
- Visually hidden with the sr-only pattern (`position:absolute; 1×1px; clip-path: inset(50%); overflow:hidden; margin:-1px; white-space:nowrap`) — **not** `display:none` / `visibility:hidden` / `aria-hidden`, which would remove it from the accessibility tree.
- Asserted: attributes present, computed style not display-none/hidden, ≤1×1 px box. `getComputedAccessibleNode` is unavailable in this environment, so full AX-tree name resolution is asserted at attribute level only; a Playwright `page.accessibility`/ARIA-snapshot check can harden this in M2. Rendered data-`<table>`-behind-a-toggle deferred to M2 per plan.

## Chromium quirks encountered

1. **`willReadFrequently: true`** on `getContext('2d', …)` for any context that will be read back — avoids Chromium's repeated-GPU-readback warning and slow path once `getImageData` is called more than once. M2's hit-testing/VR code should set it on test/readback contexts only (it forces a CPU canvas; don't set it on the production render context).
2. **`elementsFromPoint` honors `pointer-events: none`** — inert strata are invisible to it. This is per spec, not a bug, but it shapes how tests must be written (see corollary above).
3. **Headless chromium runs at `devicePixelRatio = 1`** by default (verified). DPR ≠ 1 behavior must be exercised via the explicit-dpr transform recipe (done at dpr 2 and 1.5) or Playwright `deviceScaleFactor`; the VR plan's pinned `deviceScaleFactor: 1` matches this default.
4. **Fractional DPR rounding**: `cssSize × dpr` is not always an integer (e.g. 301 × 1.5); `canvas.width` truncates silently if handed a float — always `Math.round` explicitly. At fractional DPR the CSS box (exact) and backing store (rounded) disagree by <1 device px at the right/bottom edge; harmless at plot scale, but device-pixel-snapping helpers should derive from `canvas.width`, not `cssW·dpr`.
5. **Toolchain, not browser** (for the record): the committed `spikes/browser/vitest.config.ts` uses the vitest-3 string form `provider: 'playwright'`, which vitest 4 removed — it needs `playwright()` from `@vitest/browser-playwright` (a package that wasn't installed). This spike could not modify that file, so it runs via `vitest.strata.config.ts` with the provider package hand-installed into `spikes/browser/node_modules`. **Follow-up for M0b:** add `@vitest/browser-playwright` to devDependencies and switch `vitest.config.ts` to the factory form, then delete `vitest.strata.config.ts`. Also: on this machine the shell/node are x64-under-Rosetta while bun and the installed rolldown binding are arm64 — run vitest with `bunx --bun` (or install an arm64 node) or rolldown fails to load its native binding.

## Proven vs deferred

**Proven (chromium only):** sibling-strata document-order compositing; SVG-over-canvas-over-SVG stacking; per-panel canvas clipping with save/beginPath/rect/clip/restore; DPR backing-store recipe at dpr 1, 2, 1.5; all-strata-inert + single-capture-layer pointer policy with plot-space hit resolution independent of painting stratum; a11y block structure/attributes.

**Deferred:** Safari and Firefox untested (pinned Playwright chromium is the only baseline platform per plan — cross-browser is a later concern); AX-tree name-resolution assertion; data-table toggle; quadtree + exact containment/stroke-proximity hit testing (M2); hybrid threshold switching; tooltip overlay behavior; scroll/zoom/transform interactions with `getBoundingClientRect` mapping.

## Guidance for M2 canvas work

- Build the stratum list exactly as above; keep the a11y block adjacent to its canvas stratum; capture layer is always the last child. Never introduce z-index — insertion order is the API.
- Keep all drawing code in CSS px against a dpr-`setTransform`ed context; re-run `sizeCanvasForDpr` on resize and DPR change (`matchMedia('(resolution: …)')` listener), then redraw — resizing a canvas clears it.
- Panels: one `drawClippedToPanel` per panel per layer batch; group same-panel batches to amortize save/clip/restore.
- Hit index stays in plot-pixel space fed from layout output, never from DOM geometry; the capture layer is the single event source for hover/brush/click.
- For canvas readback in tests, always create the context with `willReadFrequently: true` and read at device coordinates (`round(cssPx · dpr)`).
