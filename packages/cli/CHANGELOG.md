# @ggsvelte/cli

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

- Updated dependencies [44124a6]
- Updated dependencies [c851682]
- Updated dependencies [5105cdc]
  - @ggsvelte/core@0.29.1

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

### Patch Changes

- Updated dependencies [576fdbf]
  - @ggsvelte/core@0.29.0

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

- Updated dependencies [15d7c79]
- Updated dependencies [70c8c82]
- Updated dependencies [89efa48]
- Updated dependencies [3217502]
- Updated dependencies [5531a8d]
- Updated dependencies [6295520]
- Updated dependencies [ef631d6]
  - @ggsvelte/core@0.28.0

## 0.27.0

### Patch Changes

- Updated dependencies [a1184f3]
  - @ggsvelte/core@0.27.0

## 0.26.2

### Patch Changes

- Updated dependencies [b6d495a]
- Updated dependencies [add63a4]
- Updated dependencies [3b5b07f]
  - @ggsvelte/core@0.26.2

## 0.26.1

### Patch Changes

- Updated dependencies [3828c57]
- Updated dependencies [4e775d9]
- Updated dependencies [9b51ddf]
  - @ggsvelte/core@0.26.1

## 0.26.0

### Patch Changes

- Updated dependencies [56b856b]
  - @ggsvelte/core@0.26.0

## 0.25.0

### Patch Changes

- Updated dependencies [36efe51]
- Updated dependencies [7d92209]
- Updated dependencies [8074811]
- Updated dependencies [072640f]
- Updated dependencies [120b5de]
- Updated dependencies [1fbbf45]
- Updated dependencies [d15954d]
- Updated dependencies [7c748ec]
- Updated dependencies [86c36ab]
  - @ggsvelte/core@0.25.0

## 0.24.3

### Patch Changes

- Updated dependencies [a84fd4e]
- Updated dependencies [47a660a]
- Updated dependencies [5d8c5b8]
- Updated dependencies [a8c2292]
  - @ggsvelte/core@0.24.3

## 0.24.2

### Patch Changes

- Updated dependencies [36569c5]
  - @ggsvelte/core@0.24.2

## 0.24.1

### Patch Changes

- 45c6cc9: # Refresh package README front doors

  Migration: none — package README + skill docs only

  Rewrite the npm package READMEs for current APIs; treat them as shipped
  surfaces for changesets and CI; execute TypeScript fences in unit tests. Fix
  skill prose that still called 0.13.0 grammar-prop removal “planned.”

- 06afe2c: # Share frozen band domain across facet guide plans

  Migration: none — internal memory hygiene; guide plan domain contents and freeze contract unchanged.

  Under fixed facet scales, band axis guide plans reused to copy `scale.rawDomain`
  once per panel. Reuse the already-frozen array when present so panels share one
  object. Free scales still get distinct domains because each panel trains its own
  `rawDomain`.

- Updated dependencies [45c6cc9]
- Updated dependencies [06afe2c]
- Updated dependencies [95aa7b2]
  - @ggsvelte/core@0.24.1

## 0.24.0

### Patch Changes

- Updated dependencies [a3de79e]
- Updated dependencies [12da8b8]
- Updated dependencies [8c9685f]
- Updated dependencies [8f75979]
- Updated dependencies [375f0d2]
- Updated dependencies [e28fa5f]
- Updated dependencies [4d23a25]
  - @ggsvelte/core@0.24.0

## 0.23.0

### Minor Changes

- 50e9292: # CLI split: ggsvelte-render moves to @ggsvelte/cli

  The `ggsvelte-render` CLI moves to its own package, `@ggsvelte/cli` (ADR 0022).

  - `@ggsvelte/cli` (new): owns the `ggsvelte-render` bin; depends only on
    `@ggsvelte/core`, so agent sandboxes install the spec feedback loop without
    the Svelte component library. Also re-exports `runCLI`/`CLIIO` for
    spawn-free embedding.
  - `@ggsvelte/svelte` (breaking, pre-1.0 minor): no longer ships the
    `ggsvelte-render` bin. Migrate with `npm install -g @ggsvelte/cli` (or add
    `@ggsvelte/cli` as a dependency) — the command name and behavior are
    unchanged. `ggsvelte-codemod` still ships with `@ggsvelte/svelte`.
  - `@ggsvelte/core`: the `--version` help text no longer names
    `@ggsvelte/svelte`; `runCLI` reports the version its caller passes.

  Migration: <https://ggsvelte.sh/guide/upgrading#cli-moved-to-ggsvelte-cli>

### Patch Changes

- Updated dependencies [50e9292]
- Updated dependencies [1d68bcc]
- Updated dependencies [322bc60]
- Updated dependencies [97f739a]
- Updated dependencies [8987d9c]
- Updated dependencies [ccdab47]
- Updated dependencies [c8d7484]
- Updated dependencies [e57bdbf]
- Updated dependencies [9e43af7]
- Updated dependencies [488f170]
- Updated dependencies [a54207b]
- Updated dependencies [9ae7909]
- Updated dependencies [4870c0c]
- Updated dependencies [146c2c8]
  - @ggsvelte/core@0.23.0

## 0.22.0

Initial extraction: the `ggsvelte-render` bin moved here from
`@ggsvelte/svelte` so agent sandboxes can install the spec feedback loop
without the Svelte component library. Release history before 0.22.0 lives in
the `@ggsvelte/svelte` changelog.
