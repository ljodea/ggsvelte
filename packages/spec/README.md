# @ggsvelte/spec

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-spec)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fspec)

PortableSpec types, published JSON Schema (`schema/v0.json`), `normalize()`,
two-tier `validate()` with the agent error contract
(`{ code, path, message, allowed?, fix }` — every fix carries a
machine-applicable example), `lintSpec()`, and the fluent `gg()/aes()` builder.
No DOM, no d3. Pre-1.0.

```sh
bun add @ggsvelte/spec     # or: npm install @ggsvelte/spec
```

Install alone for validation and authoring without a renderer.
`@ggsvelte/svelte` re-exports this package.

## Quick example

```ts
import { gg, aes, validate } from "@ggsvelte/spec";
// constrained decoding / tool schemas
import schema from "@ggsvelte/spec/schema/v0.json";

const spec = gg(
  [
    { year: "1835", value: 12 },
    { year: "2026", value: 31 },
  ],
  aes({ x: "year", y: "value" }),
)
  .geomLine()
  .spec();

const result = validate(spec, {
  profile: {
    fields: [
      { name: "year", type: "temporal" },
      { name: "value", type: "quantitative" },
    ],
  },
  lint: true,
});
if (!result.ok) {
  // { code, path, message, allowed?, fix: { description, example } }
}
```

## Contract

- **Emit, validate, fix.** `validate(spec)` is shape; `validate(spec, { profile })`
  is data-aware without shipping rows; `{ lint: true }` adds advisories. Apply
  `fix.example` at `path` and re-validate.
- **Temporal.** Automatic inference covers ISO, `YYYY`, year-month, month-year,
  and year-quarter after whole-column validation. Ambiguous ordered dates need
  an explicit parser (`parse: "dmy"`, etc.).
- **Numeric transforms.** Closed names (`identity` | `log10` | `sqrt`) run
  before statistics. Domains/limits are semantic; OOB censor/squish runs before
  the transform. Authored `type: "log"` normalizes to linear + log10.
- **Color/fill.** `ordinal`, `sequential`, `binned`, `manual`, `identity`.
  Binned color caps at 64 intervals; manual needs one range color per domain
  value.
- **Style channels.** `size` / `linewidth` / `alpha` share sequential–identity
  families. `shape` and `linetype` use finite named sets — quantitative
  mappings require explicit binning.
- **Guides.** Separate from scale math. Top-level `guides` wins over scale-local
  `guide`. Invalid aesthetic/variant pairs fail validation.
- **Coords.** `coordTransform` is post-stat projection. `coordFixed({ ratio })`
  is physical y-unit/x-unit length; free positional facet scales are rejected.
- **PortableSpec.** No `Date`, callbacks, or regular expressions. Builder
  `Date` values canonicalize to ISO strings.

Render with [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
(headless SVG) or
[`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
(Svelte 5).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
