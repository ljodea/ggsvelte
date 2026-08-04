# ggsvelte

[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg)](https://app.codecov.io/gh/ljodea/ggsvelte)

A layered grammar of graphics in Svelte for agents. Inspired by ggplot.

[Documentation](https://ggsvelte.sh/) · [Examples](https://ggsvelte.sh/examples) ·
[Getting started](https://ggsvelte.sh/guide/getting-started)

## Install

```sh
bun add @ggsvelte/svelte
# or: npm install @ggsvelte/svelte
```

Requires Node.js 22+ and Svelte 5.33.1+. CI covers npm, pnpm, and Bun on Ubuntu
and Windows.

## Agents

- Skill: [`@ggsvelte/skill`](packages/skill) — install from npm, then copy
  `node_modules/@ggsvelte/skill` into your agent's skills dir as `ggsvelte/`
  (dependabot surfaces version bumps for bundled copies). In-tree source:
  [`packages/skill/SKILL.md`](packages/skill/SKILL.md)
- Schema: [`schema/v0.json`](https://ggsvelte.sh/schema/v0.json)
- Corpus: [`llms.txt`](https://ggsvelte.sh/llms.txt) ·
  [`llms-full.txt`](https://ggsvelte.sh/llms-full.txt)
- `validate()` errors are `{ code, path, message, fix }` with a
  machine-applicable `fix.example`

## Packages

| Package                               | Surface                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| [`@ggsvelte/svelte`](packages/svelte) | Svelte 5 components, re-exports                                     |
| [`@ggsvelte/spec`](packages/spec)     | PortableSpec types, JSON Schema, validate/normalize, fluent builder |
| [`@ggsvelte/core`](packages/core)     | Pipeline, headless SVG, canvas, hit testing                         |
| [`@ggsvelte/cli`](packages/cli)       | `ggsvelte-render` CLI: validate + render specs in agent sandboxes   |
| [`@ggsvelte/skill`](packages/skill)   | Agent skill (SKILL.md + references) teaching the grammar            |

## Benchmarks

Cold mount speed vs [SveltePlot](https://svelteplot.dev) and
[LayerCake](https://layercake.graphics).

![10,000-point colored scatter: ggsvelte 75.5 ms, LayerCake 354.3 ms, SveltePlot 7,193 ms](apps/docs/static/benchmarks/bench-scatter-mount.svg)

![3 × 10,000-point line chart: ggsvelte 52 ms, LayerCake 65 ms, SveltePlot 1,889 ms](apps/docs/static/benchmarks/bench-line-mount.svg)

| Capability                                                 | ggsvelte  | SveltePlot           | LayerCake                    |
| ---------------------------------------------------------- | --------- | -------------------- | ---------------------------- |
| **Bundle size** (min+gzip, 1k scatter app)                 | ⚠️ 137 KB | ✅ 109 KB            | ✅ 41 KB                     |
| **API stability** (pre-1.0 can break)                      | ⚠️ v0.30  | ⚠️ v0.14             | ✅ v10                       |
| **Headless server-side SVG** (no DOM)                      | ✅        | ❌ empty shell       | ⚠️ opt-in `ssr` flag         |
| **Portable JSON spec + schema**                            | ✅        | ❌                   | ❌                           |
| **CLI validator + renderer**                               | ✅        | ❌                   | ❌                           |
| **Agent skill** (SKILL.md, llms.txt)                       | ✅        | ❌                   | ❌                           |
| **Automatic temporal detection**                           | ✅        | ⚠️ Date objects only | ❌                           |
| **Built-in interactions** (tooltip, select, zoom, linking) | ✅        | ⚠️ tooltip + brush   | ❌                           |
| **ggplot2 API**                                            | ✅        | ❌                   | ❌ hand-written marks        |
| **Scale, axis & coord control**                            | ✅        | ✅                   | ⚠️ hand-configured d3 scales |

Harness and full matrix (d3, uPlot, Chart.js, ECharts):
[`benchmarks/competitive`](benchmarks/competitive).

## Reference

- [Guide](https://ggsvelte.sh/docs)
- [Example gallery](https://ggsvelte.sh/examples)
- [Themes and palettes](https://ggsvelte.sh/themes)
- [Interactions and events](https://ggsvelte.sh/reference/interactions)
- [Production](https://ggsvelte.sh/guide/production)
- [Upgrading](https://ggsvelte.sh/guide/upgrading)

## Release status

Pre-1.0. Package manifests are the version source of truth. Lifecycle and
compatibility contracts live in [`lifecycle.json`](lifecycle.json) and the
[lifecycle guide](https://ggsvelte.sh/guide/lifecycle).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Liam O'Dea. Loess reference attribution is in [NOTICE](NOTICE).
