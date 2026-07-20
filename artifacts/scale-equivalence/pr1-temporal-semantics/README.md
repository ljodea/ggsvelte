# PR 1 temporal scale evidence

Browser-inspected on 2026-07-19.

## Positive fixture

`examples/line/time-axis` passes untouched strings from 1835 through 2025 to all three authoring surfaces. There is no date preprocessing and no explicit x scale. The runtime infers a year parser, validates the full column, trains one continuous UTC calendar domain, and produces width-aware year labels.

- `ggsvelte-render.png`: isolated 1280 px browser render.
- `browser-1280.png`: full task page and canonical PortableSpec.
- `browser-375.png`: responsive narrow viewport; full 1835–2025 line remains visible and labels thin to 1850/1900/1950/2000 without collision.
- `browser-dark-1280.png`: dark documentation appearance with chart-theme isolation intact.
- `browser-verification.json`: semantic/browser assertions.

A clean reload had zero console errors and zero failed network requests.

## ggplot2 reference

`ggplot2-reference.png` uses the same observations, converts each precision-preserving year to January 1 only for ggplot2's `Date` input, and relies on ggplot2 4.0.3's default `scale_x_date`. Both renders preserve the same continuous calendar geometry, domain ordering, endpoints, extrema, and readable multi-decade year labels. Pixel identity is intentionally not asserted because the projects have different default themes and text metrics.

## Negative controls

- Explicit `scales.x.type = "band"` keeps four-digit identifiers discrete.
- Ambiguous DMY/MDY values remain nominal and receive an actionable advisory.
- Explicit parser failure defaults to an error, with `parseFailure: "censor"` as an opt-in.
- Broken inference/parser fixtures are covered in the temporal parser and pipeline suites so evidence fails on regression.

## Supporting evidence

- `performance.json`: 100k-row temporal workload is 1.3256× the numeric scatter workload and below the 1.5× initial limit.
- `dependency-size.json`: packed package and polyfill size measurements plus SSR/browser verification scope.
- `tthw.md`: strict clean-consumer journey under five minutes.
