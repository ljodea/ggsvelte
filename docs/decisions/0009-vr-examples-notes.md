# 0009 — M1 VR + examples + docs: choices, deviations, follow-ups

- **Status:** accepted (M1 VR workstream landed)
- **Date:** 2026-07-11
- **Scope:** plan milestone M1's VR/examples/docs half — the examples corpus
  (15 examples), the generated manifest, the SvelteKit docs site, the
  `data-gg-ready` readiness signal, the Playwright VR suite, and the
  un-guarded `vr-compare` workflow. Complements decision 0008 (M1 core).

## Font choice and its VR implications

**Decision: no self-hosted webfont in M1.** The renderer pins
`font-family="Helvetica, Arial, sans-serif"` on the SVG root (unchanged since
M0c) and the docs site uses a system-font stack for page chrome. Rationale
and consequences:

1. **Layout is metrics-table-driven, not font-driven.** Tick/label/legend
   boxes come from decision 0003's `FONT_METRICS` table (Helvetica advance
   widths, measured on macOS Chromium). The rendered SVG is therefore
   byte-identical regardless of which font the viewing browser resolves —
   only glyph RASTERIZATION differs per platform.
2. **In the pinned container** (mcr.microsoft.com/playwright:v1.61.1-noble)
   the stack resolves to **Liberation Sans**, which is metric-compatible
   with Arial (and close to Helvetica for the ASCII range the axes use), so
   text stays inside its measured boxes. Rasterization inside ONE pinned
   container is deterministic — proven locally by double runs at
   `maxDiffPixels: 0` (and cross-BUILD: baselines survived a full docs
   rebuild bit-for-bit).
3. **Cross-platform baselines are impossible by construction** (macOS
   Helvetica vs Linux Liberation Sans rasterize differently). That is why
   baselines are container-only (below), and why `snapshotPathTemplate` has
   NO platform suffix: there is exactly one legitimate baseline platform.
4. The VR spec still awaits `document.fonts.ready` before every shot. With
   system fonts it resolves immediately; the wait is kept so a future
   self-hosted font needs no test change.
5. **Follow-up (unchanged, now two-part):** decision 0007 follow-up 1 —
   regenerate `FONT_METRICS` inside the pinned container against a
   self-hosted font (then serve that font from apps/docs and drop the
   system stack). Until then, non-ASCII-heavy labels may overflow their
   measured boxes slightly on Linux; none of the current corpus does.

## Local vs container baselines (the policy, made concrete)

- `tests/visual/__screenshots__/` holds **committed** baselines and may be
  written **only** by the CI container flow. It is EMPTY as of this record
  (bootstrap pending; the `block-output-paths` pre-commit guard refuses
  local commits into it).
- `vr-compare` (unprivileged, pinned container) now really builds packages +
  docs and runs the suite. **Missing-baseline tolerance:** when
  `__screenshots__/` is empty it runs `--update-snapshots` instead of
  failing, posts a "VR bootstrap mode" step summary, and uploads the
  generated PNGs as the `vr-baselines` artifact — so the FIRST CI run on
  GitHub produces the baseline set, which lands via `vr-approve`'s verified
  inert-artifact path (PNG magic bytes, count/size caps, head-SHA match).
- **Local runs use a throwaway dir**: `VR_SNAPSHOT_DIR=.local-baselines`
  (gitignored) — generate once with `--update-snapshots`, then compare.
  Local shots are for pipeline debugging only and are never committable.
- **TODO (recorded in vr-approve.yml, M3):** alongside the `/approve-visuals`
  gate, add the CI guard that rejects any PR diff touching
  `tests/visual/__screenshots__/` unless authored by the workflow bot
  identity — closing the `SKIP=block-output-paths` local loophole at the
  merge gate rather than the commit hook.

## Design decisions

1. **Manifest is generated TS, checked byte-for-byte.**
   `scripts/gen-manifest.ts` emits `examples/manifest.ts` (codepoint-sorted,
   case-insensitive id collision detection because macOS filesystems would
   merge what Linux would not; meta.json validated). The `manifest-current`
   pre-commit hook and vr-compare both run `--check`; a unit test also
   compares the committed bytes. oxfmt ignores the file — the generator owns
   its bytes (same pattern as the schema artifact, decision 0007).
2. **`defineExample` validates at tier 2 eagerly** (examples carry inline
   data), so a broken example fails at manifest-gen/docs-build/VR time with
   the structured error contract, never rendering garbage.
3. **VR pages are the DOCS pages** (`?vr&theme=light|dark` on the normal
   example route): a blocking inline script in app.html stamps
   `data-theme` + `data-vr` on `<html>` pre-paint; ALL vr styling/stripping
   is CSS keyed on those attributes (`.site-chrome`/`.example-prose` hidden,
   transitions/animations frozen, `.gg-example-frame` pinned at the origin).
   No JS branching on search params → no hydration mismatch with the
   prerendered HTML. On the public site (no `?vr`) the same script maps
   `prefers-color-scheme` to `data-theme`.
4. **Theme bridge:** the docs stylesheet defines `--gg-ink/grid/accent` per
   `[data-theme]` with values mirroring core's `BUILTIN_THEMES` — examples
   keep the `default` (currentColor) theme and restyle via CSS custom
   properties, exercising the plan's "restyle without re-render" contract in
   every VR shot.
5. **`data-gg-ready`** lives on a new `.gg-plot-root` wrapper div in
   `<GGPlot>` (the future strata mount point, plan's compositing model). It
   flips to `"true"` in an `$effect` after the first committed render flush;
   `$effect` never runs during SSR, so prerendered pages report ready only
   after hydration re-renders — exactly the state a screenshot should wait
   for. When canvas strata land (M2) the flip must ALSO wait for their first
   paint. `renderToSVGString` is untouched.
6. **`maxDiffPixels: 0`, retries 0.** The renderer is byte-deterministic and
   the container is pinned; any pixel diff is a real change. Two consecutive
   local comparison runs (and a third after a full rebuild) passed 30/30.
7. **Static file server is hand-rolled** (`scripts/serve-docs.ts`, Bun.serve,
   ~40 lines, path-containment check): the VR webServer target must be the
   adapter-static output exactly as deployed, with zero dev-server
   transforms.
8. **Corpus data is static or seeded** (mulberry32 in `examples/rng.ts`);
   the pre-wired oxlint `Math.random`/`Date.now` ban on `examples/**` is now
   exercised by real files.

## Deviations from the letter of the task/plan

- **mdsvex skipped** (explicitly optional this milestone) — no prose-page
  need yet; routes are plain Svelte.
- **`vrHeight` is defined + plumbed but unused**: all 15 examples render
  640×400. First taller example exercises it end to end (manifest → frame
  style → VR shot).
- **No oxipng/size-guard on baselines yet** — meaningful only when real
  baselines land via the bootstrap PR (M3, with the approval flow).
- **`bun run test` now includes `scripts/`** (the manifest generator's unit
  tests) — the pre-push hook and CI unit job were updated to match.
- **Pre-push tsc-build hook became package-build** (`bun run build`): the
  docs app and examples corpus import the BUILT `@ggsvelte/svelte` package, so
  svelte-package must run before docs/examples checks. Adds ~1s.
- The docs header's GitHub link points at a placeholder org URL (repo not
  published yet).

## Follow-ups (M2/M3)

1. Bootstrap committed baselines via the first vr-compare run on GitHub +
   the vr-approve verified path; then wire oxipng + baseline size guard.
2. `/approve-visuals` maintainer gate and the bot-authorship guard for
   `__screenshots__` diffs (both recorded as TODOs in vr-approve.yml).
3. Self-hosted font + container-regenerated `FONT_METRICS`
   (decision 0007 follow-up 1; font section above).
4. llms-full.txt generation from the same manifest (M3 — the third of the
   "three uses").
5. Docs polish: syntax highlighting in the triptych, gallery thumbnails
   (render SVG statically at build time), real GitHub URL.
6. Grow the corpus with M2 geoms (histogram/smooth/boxplot/density) — 2 per
   geom, per the plan's golden-corpus rule.
