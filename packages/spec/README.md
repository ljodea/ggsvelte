# @ggsvelte/spec

The ggsvelte plot specification: `PortableSpec` types, the published JSON
Schema (`schema/v0.json`), the `normalize()` canonicalizer, two-tier
`validate()` with the agent error contract (`{ code, path, message,
allowed?, fix }` — every fix carries a machine-applicable example),
`lintSpec()` advisories, portability helpers, and the fluent `gg()/aes()`
builder. Zero DOM, zero d3. The v0.1 API is intentionally early.

```sh
bun add @ggsvelte/spec     # or: npm install @ggsvelte/spec
```

Most apps want the [`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
package instead — it re-exports all of this. Install `@ggsvelte/spec` alone
for validation/authoring tooling with no renderer.

## Quick example

```ts
import { gg, aes, normalize, validate, lintSpec } from "@ggsvelte/spec";

// Builder -> canonical PortableSpec (validated)
const spec = gg(rows, aes({ x: "displ", y: "hwy" }))
  .geomPoint()
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

Render the spec with [`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core)
(headless SVG) or [`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte)
(Svelte 5 components).

Repo + docs: <https://github.com/ljodea/ggsvelte> · MIT © Liam O'Dea
