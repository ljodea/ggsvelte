# @ggsvelte/skill

## 0.30.2

### Patch Changes

- e30a788: # Document skill test layers and seed trigger fixtures

  Migration: none — package README plus repo-only eval fixtures; no API change.

  Document the three-layer skill test story (content contracts, trigger/disclosure
  contracts, held-out NL→spec evals). Repo-only `evals/trigger-cases.json` seeds
  future agent-in-the-loop skill evals and is not packed to npm.

## 0.30.1

## 0.30.0

### Patch Changes

- 796cb50: <!-- markdownlint-disable MD041 -->

  feat: circle-open point shape (unfilled ring)

  Add `"circle-open"` to the point shape registry (ggplot2 shape 1): an
  unfilled ring stroked in the mark's color channel, stroke width
  max(1, size/3). Available as a scalar `params.shape`, as a shape-scale
  range value, and through the shared `pointShapeGeometry` table, so SVG,
  canvas, and both legend renderers draw it consistently. Interaction hit-
  testing treats it as a circle of the same size.

  Appended to `POINT_SHAPE_NAMES` (not inserted), so default discrete shape
  assignments for domains of ≤ 6 levels are unchanged; a 7th level now assigns
  circle-open instead of throwing/cycling one level earlier.

  Migration: none — additive

- 796cb50: <!-- markdownlint-disable MD041 -->

  feat: stat_summary_rolling centered rolling-window summaries

  Add `stat: "summary_rolling"` on line and point layers: one output row per
  (group, unique x), summarizing y over the centered window
  |x − center| ≤ params.window/2. `params.window` (x data units, > 0) is
  required — the spec validator raises `summary-rolling-window-required` with a
  named fix and the core stat throws as the pipeline backstop. `params.fun`
  defaults to mean; pass "median" for a running median line. Partial windows
  at the series ends are kept (divergence from zoo's default NA padding), so a
  running line reaches both ends of the data. Windows never cross groups.

  Component-form registration follows the #1420 contract: a `GeomLine` /
  `GeomPoint` shell self-registers only its default stat, so a
  `stat="summary_rolling"` override needs one `registerSummaryRolling()` call
  at app startup (exported from `@ggsvelte/svelte` / `@ggsvelte/core`); spec-
  driven surfaces call `registerAll()` as before. Missing registration fails
  loudly with the register hint.

  Migration: none — additive

## 0.29.1

### Patch Changes

- 44124a6: # Elevate tooltip cards on dark, hcdark, 538, economist

  Raise default tooltip surfaces so tips read as floating cards on `dark`,
  `hcdark`, `fivethirtyeight`, and `economist`. Edition-2 dark elevates fill only;
  LEGACY dark elevates `tooltipPaper` only (border stays rgba grid-derived).
  hcdark also brightens tip ink. VR smoke golden `interaction-tooltip-dark.png`
  updates with the dark tip change.

- c851682: # Solarized tooltip surfaces for contrast

  Elevate tooltip cards on `solarized`, `solarizeddark`, `solarized_2`, and
  `solarized_2dark` using adjacent Schoonover base steps so tips no longer match
  the chart panel. Tip ink steps stronger than axis ink (base01/base1) for short
  reading chrome. Light solarized tip text is palette-native near-AA (4.39∶1).

- 5105cdc: # Tooltip overrides in themed() and sticky-when-elevated resolveTheme tips

  `themed()` accepts optional `tooltipPaper` / `tooltipInk` / `tooltipBorder` so
  complete themes can elevate the tip package above pure foundation derivation.

  `resolveTheme` object path uses sticky-when-elevated tip inheritance: named bases
  that store non-derived tip roles keep them when authors only tweak
  typography/accent/etc.; pure themes still re-derive tip from paper/panel/grid.
  Explicit ThemeSpec tip roles still win.

  No built-in problem-theme hex changes in this release slice — those follow in
  separate token PRs.

## 0.29.0

### Minor Changes

- 576fdbf: # Drop Tableau 10, Summer, Winter, and stone schemes

  Migration: <https://ggsvelte.sh/guide/upgrading#removed-tableau-10-summer-winter-and-stone-schemes>

  Remove six categorical schemes (and public `*_PALETTE` constants):
  `tableau10`, `tableau_summer`, `tableau_winter`, `tableau_miller_stone`,
  `tableau_superfishel_stone`, `tableau_nuriel_stone`.

  Prefer `observable10`, `colorblind`, `Dark2`, `pander`, or another remaining
  Tableau scheme (`tableau20`, `tableau_colorblind`, `tableau_jewel_bright`, …),
  or pass an explicit `range`.

  Skill inventory (`SKILL.md`, `references/scales-and-palettes.md`) drops the
  same schemes so agents no longer list them.

## 0.28.0

### Minor Changes

- 3217502: # Drop Accent, Paired, Grey, Google Docs, and Tableau multi-hue schemes

  Migration: <https://ggsvelte.sh/guide/upgrading#removed-accent-paired-grey-google-docs-and-tableau-multi-hue-schemes>

  Remove eight categorical schemes (and public `*_PALETTE` constants where they
  existed): `Accent`, `Paired`, `grey`, `gray`, `gdocs`,
  `tableau_green_orange_teal`, `tableau_red_blue_brown`,
  `tableau_purple_pink_gray`.

  Also remove chart theme `gdocs` and its Svelte shell `ThemeGdocs`.

  `scaleColorGrey()` / `<ScaleColorGrey />` still work by baking an explicit
  greyscale `range` (optional `start`/`end`). They no longer emit
  `scheme: "grey"`. Prefer `Dark2`, `tableau10`, `colorblind`, or `pander` for
  named categorical color; prefer `minimal`, `classic`, or `bw` for themes.

  Skill inventory (`SKILL.md`, `references/scales-and-palettes.md`,
  `references/themes.md`) drops the same schemes and theme so agents no longer
  list them.

- 5531a8d: # Drop spreadsheet/Stata-extra schemes and Excel/Calc/Stata Mono themes

  Migration: <https://ggsvelte.sh/guide/upgrading#removed-spreadsheet-highcharts-and-extra-stata-schemes-and-themes>

  Remove nine categorical schemes and their public `*_PALETTE` constants:
  `stata_s1color`, `stata_s1rcolor`, `stata_mono`, `hc`, `hc_dark`, `calc`,
  `excel`, `excel_fill`, `excel_new`.

  Also remove four chart themes (and their Svelte shells): `stata_mono`
  (`ThemeStatamono`), `calc` (`ThemeCalc`), `excel` (`ThemeExcel`), `excel_new`
  (`ThemeExcelnew`). Nothing with "Excel" remains in the product surface.

  Skill inventory drops the same schemes and themes.

  Switch removed schemes to `stata`, `tableau10`, `Dark2`, or `pander`.
  Switch removed themes to `stata`, `stata_s1color`, `bw`, `classic`, or
  `minimal`.

### Patch Changes

- cd7a4c8: # Skill teaches the stat-override registration contract

  docs(skill): teach the stat-override registration contract (#1420). `<Geom*>` children self-register only their DEFAULT stat; the stat usage patterns, the errorbar `stat="summary"` recipe, and the SKILL.md preamble now name the matching `register<Family>()` calls from `@ggsvelte/svelte` (and `registerAll()` for spec-driven surfaces). Agents following the skill previously produced apps that threw "not registered in this build" for `stat="…"` overrides.

## 0.27.0

### Minor Changes

- 2effe5c: # Skill moved to @ggsvelte/skill

  Migration: <https://ggsvelte.sh/guide/upgrading#skill-moved-to-ggsvelte-skill>

  The agent skill is now its own package, `@ggsvelte/skill`, versioned in lock-step with the rest of ggsvelte. The package root is the skill directory: install it and copy/symlink `node_modules/@ggsvelte/skill` into your agent's skills directory as `ggsvelte/`, or point agents at `node_modules/@ggsvelte/skill/SKILL.md` directly. Dependabot now surfaces skill updates for bundled copies.

  **Breaking (pre-1.0):** `@ggsvelte/svelte` no longer bundles the skill — `node_modules/@ggsvelte/svelte/skills/ggsvelte/` is gone. Migrate by adding `@ggsvelte/skill` as a (dev) dependency and copying from there instead.
