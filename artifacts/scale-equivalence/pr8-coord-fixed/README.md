# PR 8 — fixed coordinates and integrated release evidence

## Contract

`coordFixed`/`coord_fixed`/`coordEqual` fit the largest centered data rectangle satisfying `height / width = ratio × yScaleSpaceSpan / xScaleSpaceSpan` after titles, axes, facets, and guides reserve space. The ratio is exact across responsive sizes. Fixed facets share equal dimensions; free positional facets fail before rendering and defensively in Core. Letterbox gutters use `ThemeTokens.letterboxFill` (paper by default). A dimension below 64 px keeps the ratio, removes minor furniture, declares `data-gg-layout="degraded"`, and emits one `coord-fixed-degraded` warning.

## Evidence

- Canonical PortableSpec: `canonical-spec.json`
- ggplot2 source reference: `ggplot2-reference.R`
- ggplot2 render: `ggplot2-reference.png`
- gstack browser renders: `browser-1280.png`, `browser-375.png`, `browser-dark-1280.png`
- Browser measurements: `browser-verification.json`
- Benchmark: `performance.json` (`2.2124 ms` median, `6 ms` budget)
- Dependency/portability audit: `dependency-size.json`
- Clean-room author-success audit: `tthw.md`

## Browser result

The 640×440 desktop scene fitted a 350×350 data rectangle inside a 588×350 allocation. The 343×440 mobile scene fitted 291×291 inside 291×350. Both measured aspect 1.000, had zero horizontal overflow, and logged no console errors. Dark-theme Core SVG uses the same geometry and renderer contract.

## Parity notes

- ggplot2 defines `CoordFixed$aspect()` as `diff(y.range) / diff(x.range) * ratio`; Core uses the equivalent trained scale-space span formula.
- Both default to ratio 1 and expose `coord_equal` as an alias.
- ggsvelte currently keeps coordinates as a closed union, so fixed aspect does not compose with flip/transform in one spec.
- The canonical ggsvelte example uses points around the unit circle because line geometry sorts by x; this presentation difference does not alter the coordinate ratio evidence.

## Release gates

Spec/Core focused TDD, Svelte Chromium rendering, strict type checks, migration fixture synchronization, generated schema/lifecycle/docs/search/playground/gallery artifacts, deterministic evals, packed npm/pnpm consumers, R reference generation, and gstack browser QA are covered. Full root, browser-engine, SSR, docs, package, benchmark, and CI/VR gates remain authoritative before merge.
