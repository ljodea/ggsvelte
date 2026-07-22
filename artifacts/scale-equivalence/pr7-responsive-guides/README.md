# PR 7 evidence: responsive guide presentation

This evidence set covers portable axis/legend/colorbar/colorsteps presentation,
responsive right/bottom layout, strict discrete-guide merging, and merged focus
semantics without changing trained scale math.

## Contract exercised

- Top-level and scale-local guide precedence, suppression, force visibility, and
  incompatible-family diagnostics.
- Automatic right placement only when a 320px readable panel remains; narrow
  guides move below with horizontal ramps and complete labels.
- Explicit right and bottom zones, bounded theme roles, axis tick/title visibility,
  and structured `collision: "error"` failure.
- Discrete merge identity across source field, encoded values, labels, title,
  family, missing/unknown policy, appearance, and interactivity.
- Merged legend targets index every represented aesthetic and expose complete
  accessible names while representative numeric ticks/bins remain static.

## Files

- `ggplot2-reference.R` and `ggplot2-reference.png`: independent bottom
  colorsteps reference generated with local ggplot2.
- `browser-1200.png`, `browser-375.png`, and `browser-dark-1200.png`: the
  alternate-presentation colorsteps example at desktop/mobile widths and dark
  documentation appearance.
- `browser-verification.json`: browser status, responsive auto-placement,
  no-overflow, complete-label, and merged-interaction assertions.
- `performance.json`: alternating 420/800px guide replanning at 10k rows.
- `dependency-size.json`: dependency and portable-execution delta.

The runnable alternate-presentation source is
[`examples/color/binned`](../../../examples/color/binned). Visual regression
baselines remain owned by `vr-approve`; this directory contains implementation
evidence, not files under `tests/visual/__screenshots__/`.
