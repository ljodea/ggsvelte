# @ggsvelte/svelte

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg?component=packages-svelte)](https://app.codecov.io/gh/ljodea/ggsvelte/tree/main/packages%2Fsvelte)

Svelte 5 components for ggsvelte. Re-exports `@ggsvelte/spec` and
`@ggsvelte/core` and publishes the agent skill at `skills/ggsvelte`. The
`ggsvelte-render` CLI ships separately as
[`@ggsvelte/cli`](../cli) — install it in any sandbox where an agent
authors specs.

```sh
bun add @ggsvelte/svelte
# or: npm install @ggsvelte/svelte
```

Requires Node.js 22+ and Svelte 5.33.1+.

## Example

```svelte
<script lang="ts">
  import { GeomPoint, GGPlot, Labs } from "@ggsvelte/svelte";
  import { kyotoSakura } from "@ggsvelte/svelte/data";
</script>

<GGPlot data={kyotoSakura} aes={{ x: "year", y: "bloomDoy" }}>
  <Labs
    title="Kyoto cherry blossom full-bloom dates, 812–2026"
    subtitle="Full bloom moved about ten days earlier after the industrial era"
    x="Year"
    y="Day of year"
  />
  <GeomPoint size={2} alpha={0.7} />
</GGPlot>
```

Scale transforms change the values stats see; `coordTransform` projects after
stats. Dense points may render on canvas; axes, legends, text, and accessible
descriptions stay in the DOM. `<Guides>` places, titles, or suppresses guides
without retraining scales.

## Agent skill

Published path: `node_modules/@ggsvelte/svelte/skills/ggsvelte/SKILL.md`. Repo
source: [`skills/ggsvelte/SKILL.md`](../../skills/ggsvelte/SKILL.md).

Emit PortableSpec JSON, run `validate()`, apply `fix.example` at `path`,
re-validate, then render with `<GGPlot spec={…} />`, `renderToSVGString`, or
`ggsvelte-render`. Schema: [schema/v0.json](https://ggsvelte.sh/schema/v0.json)

## Upgrading

The grammar props on `<GGPlot>` (`facet`, `coord`, `scales`, `guides`,
`legend`, `theme`, `labs`) are deprecated since 0.11.0 in favour of child
layers. A codemod ships with the package; it prints a diff and writes nothing
until you ask it to:

```sh
npx ggsvelte-codemod src          # show what would change
npx ggsvelte-codemod --write src  # apply
```

Shapes it will not rewrite mechanically are printed as `manual change
required` with a link to the [upgrading
guide](https://ggsvelte.sh/guide/upgrading), never half-migrated.

## Links

- [Documentation](https://ggsvelte.sh/)
- [Getting started](https://ggsvelte.sh/guide/getting-started)
- [Example gallery](https://ggsvelte.sh/examples)
- [Interactions and events](https://ggsvelte.sh/reference/interactions)
- [Production](https://ggsvelte.sh/guide/production)
- [Upgrading](https://ggsvelte.sh/guide/upgrading)
- [Repository](https://github.com/ljodea/ggsvelte)

Pre-1.0. Lifecycle and compatibility contracts are on the docs site.

[MIT](https://github.com/ljodea/ggsvelte/blob/main/LICENSE) © Liam O'Dea
