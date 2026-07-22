# @ggsvelte/spec

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-spec)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fspec)

The ggsvelte plot specification: `PortableSpec` types, the published JSON
Schema (`schema/v0.json`), the `normalize()` canonicalizer, two-tier
`validate()` with the agent error contract (`{ code, path, message,
allowed?, fix }` — every fix carries a machine-applicable example),
`lintSpec()` advisories, portability helpers, and the fluent `gg()/aes()`
builder. Zero DOM, zero d3. The current API remains pre-1.0; correctness
fixes improve defaults in place with documented direct overrides.

```sh
bun add @ggsvelte/spec     # or: npm install @ggsvelte/spec
```

Most apps want the [`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
package instead — it re-exports all of this. Install `@ggsvelte/spec` alone
for validation/authoring tooling with no renderer.

## Quick example

```ts
import { gg, aes, normalize, validate, lintSpec } from "@ggsvelte/spec";

// Builder -> canonical PortableSpec (validated). Raw year strings infer time.
const spec = gg(
  [
    { year: "1835", value: 12 },
    { year: "2026", value: 31 },
  ],
  aes({ x: "year", y: "value" }),
)
  .geomLine()
  .spec();

// Validate agent-emitted JSON against a DataProfile (no data needed)
const result = validate(candidate, {
  profile: { fields: [{ name: "displ", type: "quantitative" }] },
  lint: true,
});
if (!result.ok) {
  // every error: { code, path, message, allowed?, fix: { description, example } }
}

// JSON Schema for constrained decoding
import schema from "@ggsvelte/spec/schema/v0.json";
```

Temporal parsing is strict and portable. Automatic inference recognizes ISO values,
`YYYY`, year-month, month-year, and year-quarter after bounded classification plus
whole-column validation. Ambiguous ordered dates require an explicit parser:

```ts
import { dmy, scale_x_date } from "@ggsvelte/spec";

const dates = dmy(["31/12/2024", "01/01/2025"]); // Date authoring values
const scale = scale_x_date({
  parse: "dmy",
  dateBreaks: "2 weeks",
  dateMinorBreaks: "1 day",
  dateLabels: "%e %b",
  locale: "en-GB",
  weekStart: "monday",
});
```

Temporal break intervals are closed portable strings: a positive integer plus
millisecond, second, minute, hour, day, week, month, quarter, or year. Explicit
`breaks` outrank `dateBreaks`; `dateLabels` outranks the legacy soft-fallback
`labels` formatter.

Numeric position transforms are also closed portable names and run before
statistics. Canonical scales retain family `linear` or `binned` plus
`transform: "identity" | "log10" | "sqrt"`; authored `type: "log"` normalizes
to linear + log10. Use `scaleXLog10`, `scaleYSqrt`, `scaleXBinned`, or the
binding-identical ggplot2 aliases (`scale_x_log10`, `scale_y_sqrt`,
`scale_x_binned`). Domains/limits are semantic source units; OOB censor/squish
happens before the transform and stats.

Color/fill scales use the same strict contract across JSON, builder, and Svelte:
`ordinal`, `sequential`, `binned`, `manual`, and `identity`. CamelCase helpers
cover continuous/discrete/binned/log10/sqrt/date/datetime/manual/identity;
`color`/`colour` and ggplot2 snake-case names are binding-identical aliases.
Binned color is capped at 64 deterministic intervals, manual mappings require
one range color per domain value, and temporal families reuse the parser
registry rather than field-name inference.

Mapped `size`, `linewidth`, and `alpha` add sequential, ordinal, binned, manual,
identity, date, and datetime helpers. `shape` and `linetype` use finite named
output sets, so quantitative mappings require explicit binning instead of
silent interpolation. CamelCase, fluent-builder, and ggplot2 snake-case forms
all emit the same strict JSON; callbacks and regular expressions remain
forbidden.

Guide presentation is a separate portable contract. Use top-level `guides`, a
scale-local `guide`, fluent `.guides()`, or `guideAxis`, `guideLegend`,
`guideColorbar`, `guideColorsteps`, and `guideNone` (plus snake-case aliases).
Top-level entries win over scale-local entries. Non-position guides accept bounded
right/bottom placement, direction, collision, force, and theme overrides; invalid
aesthetic/variant combinations fail validation instead of being ignored.

Post-stat coordinate transforms use the separate strict `CoordTransformSpec`.
`coordTransform({ x: "log10", y: "sqrt" })` and its binding-identical
`coord_transform` alias emit canonical JSON; builder `.coordTransform()` emits
the same spec. Coordinate limits preserve stat inputs, `reverse` composes in
coordinate space, and `clip: false` explicitly permits panel overflow.

Fixed-aspect coordinates use `coordFixed({ ratio: 1 })`, builder
`.coordFixed()`, or the identical `coord_fixed`, `coordEqual`, and `coord_equal`
aliases. `ratio` is physical y-unit length divided by physical x-unit length.
The strict schema rejects non-positive/non-finite ratios and rejects
`coord_fixed` with free positional facet scales before rendering.

All six orders (`ymd`, `ydm`, `mdy`, `myd`, `dmy`, `dym`), timestamp variants,
exact closed formats, and epoch units are typed. PortableSpec never contains `Date`,
callbacks, or regular expressions; builder Dates canonicalize to ISO strings.

Render the spec with [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
(headless SVG) or [`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
(Svelte 5 components).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
