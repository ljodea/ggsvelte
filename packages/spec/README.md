# @ggsvelte/spec

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-spec)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fspec)

The ggsvelte plot specification: `PortableSpec` types, the published JSON
Schema (`schema/v0.json`), the `normalize()` canonicalizer, two-tier
`validate()` with the agent error contract (`{ code, path, message,
allowed?, fix }` — every fix carries a machine-applicable example),
`lintSpec()` advisories, portability helpers, and the fluent `gg()/aes()`
builder. Zero DOM, zero d3. The current v0.3.0 API remains pre-1.0; correctness
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
const scale = scale_x_date({ parse: "dmy" }); // { x: { type: "time", ... } }
```

All six orders (`ymd`, `ydm`, `mdy`, `myd`, `dmy`, `dym`), timestamp variants,
exact closed formats, and epoch units are typed. PortableSpec never contains `Date`,
callbacks, or regular expressions; builder Dates canonicalize to ISO strings.

Render the spec with [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
(headless SVG) or [`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
(Svelte 5 components).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
