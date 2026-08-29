# @ggsvelte/compose

Framework-free PortableSpec assembly: fold grammar layers, merge plot props,
and produce the same spec the `gg()` builder emits. No DOM. Pre-1.0.

```sh
bun add @ggsvelte/compose     # or: npm install @ggsvelte/compose
```

Hosts (`@ggsvelte/svelte`, `@ggsvelte/react`) import this package so
children and props assemble through one implementation.

## Quick example

```ts
import { assemblePortableSpec } from "@ggsvelte/compose";

const spec = assemblePortableSpec({
  data: [
    { year: "1835", value: 12 },
    { year: "2026", value: 31 },
  ],
  aes: { x: "year", y: "value" },
  layers: [{ geom: "line" }],
});
```

Use [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec) to
validate or lint the result, then render with
[`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core).
