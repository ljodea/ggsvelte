# PR 2 temporal guide evidence

This bundle verifies the untouched 1835–2025 raw-year line chart after semantic temporal guide planning. `fixture.json` is generated directly from `examples/line/time-axis/data.ts`; the chart has no preprocessing and no explicit time scale.

## Reproduce

Use native arm64 Bun 1.3.14:

```sh
export PATH="/private/tmp/ggsvelte-bun-1.3.14-arm64/bun-darwin-aarch64:$PATH"
bun run build
bun run build:docs
bun x playwright test tests/visual/playground.spec.ts \
  --config tests/visual/playwright.config.ts \
  --project chromium \
  --grep "191-year temporal guide"
bun run bench:json
bun run bench:budgets
Rscript -e 'library(ggplot2); # build the same 1835:2025 date domain and ggsave()'
```

Serve `apps/docs/build` with `bun scripts/serve-docs.ts`, then open `/examples/line/time-axis`. Browser captures use 320×900, 640×900, and 1200×900 CSS-pixel viewports in light and dark appearance. `browser-verification.json` records DOM bounding-box gaps and full `<title>` labels.

## Results

- `semantic-plans.json`: deterministic metrics-table plans select `50 years`, four major labels, no collision, and no margin overflow at all three extents.
- `browser-verification.json`: browser-rendered minimum neighbor gaps are positive after the required 6 px label gap; horizontal page overflow is zero.
- `time-axis-*-light.png` and `time-axis-*-dark.png`: responsive ggsvelte renders.
- `ggplot2-reference.json` and `ggplot2-reference.png`: ggplot2 and ggsvelte draw the same four in-domain 50-year labels. ggplot2 retains padded out-of-domain `NA` break slots; ggsvelte emits only drawable in-domain ticks.
- `performance.json`: candidate selection, resize churn, DST-heavy planning, and 100 free-facet layout medians with committed budgets.
- `dependency-size.json`: no dependency or lockfile change; built declaration/runtime size deltas are recorded against `origin/main@df1a8c6`.
- Playground screenshots and the report assertion verify that copied diagnostics contain decision/guide metadata but no rows, field names, domains, or labels.

Visual-regression baselines are not included. Repository policy permits `tests/visual/__screenshots__/` updates only through the post-merge `vr-approve` workflow.
