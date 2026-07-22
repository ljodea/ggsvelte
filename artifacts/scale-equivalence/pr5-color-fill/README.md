# PR 5 color/fill scale evidence

This directory owns the equivalence evidence for generic non-position color and
fill scales.

- `canonical-spec.json`: portable binned-color fixture.
- `ggplot2-reference.R`: source for the reference colorsteps render.
- `ggplot2-reference.png`: generated reference output.
- `browser-verification.json`: responsive/light/dark browser observations.
- `performance.json`: PR-specific benchmark results and budgets.
- `dependency-size.json`: package/bundle size evidence.

The comparison checks semantic boundaries, interval closure, swatch order,
color/colour alias identity, and continuous/manual/identity behavior. Visual
baselines remain owned by the `vr-approve` workflow; this directory contains
review evidence, not `tests/visual/__screenshots__/` output.
