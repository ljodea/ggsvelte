# PR 6 evidence: complete style aesthetics

This evidence set covers mapped `size`, `linewidth`, `alpha`, `shape`, and
`linetype` from authoring through browser interaction.

## Contract exercised

- Numeric sequential/ordinal/binned/manual/identity scales, including strict
  date/datetime parsing and semantic guide labels.
- Finite shape/linetype ordinal, binned, manual, and identity scales with
  explicit exhaustion behavior.
- Discrete/binned implicit grouping without continuous numeric group splits.
- Per-mark and per-subpath scene vectors shared by SVG, canvas, Svelte, and SSR.
- Mapped radius/stroke hit geometry and candidate semantic style values.
- Style-aware guide plans, legends, focus targets, and inspection fields.

## Files

- `ggplot2-reference.R` and `ggplot2-reference.png`: independent semantic
  reference generated with local ggplot2.
- `browser-1200.png`, `browser-375.png`, and `browser-dark-1200.png`: docs
  example at desktop/mobile widths and dark site appearance.
- `browser-verification.json`: browser status, console, Playground, and legend
  interaction assertions.
- `performance.json`: the 100k-row mapped-style benchmark result and initial
  132 ms budget.
- `dependency-size.json`: package output-size delta after the implementation.

The canonical runnable source is
[`examples/point/style-scales`](../../../examples/point/style-scales). Visual
regression baselines remain owned by the `vr-approve` workflow; this directory
contains implementation evidence, not files under `tests/visual/__screenshots__`.
