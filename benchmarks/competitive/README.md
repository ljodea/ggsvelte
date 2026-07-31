# Competitive browser + bundle bench

Measures ggsvelte against SveltePlot, LayerCake, and raw D3 for a colored
scatter chart.

## Bundle (Vite minify + gzip -9)

```sh
bun run measure-bundles.ts
```

Uses the lean progressive import path after FU1–FU3:

- `@ggsvelte/core/render`
- `@ggsvelte/spec/portable`

## Browser paint / update (Playwright Chromium)

```sh
bun run measure-browser.ts
```

Serves `fixtures/` via Vite, mounts each library's scatter at 1k / 10k points,
records first-mount median ms and data-update median ms (15 samples after 3
warmups).
