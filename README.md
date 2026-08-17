# ggsvelte

[![CI](https://img.shields.io/github/actions/workflow/status/ljodea/ggsvelte/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ljodea/ggsvelte/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40ggsvelte%2Fsvelte?style=flat-square)](https://www.npmjs.com/package/@ggsvelte/svelte)
[![codecov](https://codecov.io/gh/ljodea/ggsvelte/branch/main/graph/badge.svg)](https://app.codecov.io/gh/ljodea/ggsvelte)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

ggsvelte is a fast agent-native implementation of the layered grammar of
graphics, inspired by ggplot2.

[Documentation](https://ggsvelte.sh/) · [Examples](https://ggsvelte.sh/examples) ·
[Getting started](https://ggsvelte.sh/guide/getting-started)

![Bar chart of cold-mount time for a 3-series by 1,000-point area chart: ggsvelte 6.3 ms, ECharts 10.3 ms, LayerCake 7 ms, TanStack 16.1 ms, Unovis 72.5 ms, SveltePlot 222.9 ms. Lower is better.](apps/docs/static/benchmarks/bench-area-mount.svg)

![Bar chart of cold-mount time for a stacked bar chart of 50 categories by 4 stacks: ggsvelte 5.8 ms, ECharts 12.6 ms, LayerCake 6.5 ms, TanStack 16.8 ms, Unovis 32.4 ms, SveltePlot 73.3 ms. Lower is better.](apps/docs/static/benchmarks/bench-bars-mount.svg)

![Bar chart of cold-mount time for a 3-series by 10,000-point line chart: ggsvelte 30.6 ms, ECharts 33.7 ms, LayerCake 42.6 ms, TanStack 113.5 ms, Unovis 191.1 ms, SveltePlot 1,312 ms. Lower is better.](apps/docs/static/benchmarks/bench-line-mount.svg)

![Bar chart of cold-mount time for a 1,000-point colored scatter: ggsvelte 9.9 ms, ECharts 20 ms, LayerCake 22.2 ms, TanStack 30.1 ms, Unovis 103.6 ms, SveltePlot 369 ms. Lower is better.](apps/docs/static/benchmarks/bench-scatter-1k-mount.svg)

![Bar chart of cold-mount time for a 10,000-point colored scatter: ggsvelte 54.4 ms, ECharts 115.8 ms, LayerCake 238 ms, TanStack 259.3 ms, Unovis 660.3 ms, SveltePlot 5,167 ms. Lower is better.](apps/docs/static/benchmarks/bench-scatter-mount.svg)

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

## Why ggsvelte?

| Capability                                 | ggsvelte   | TanStack | SveltePlot | Unovis   | LayerCake |
| ------------------------------------------ | ---------- | -------- | ---------- | -------- | --------- |
| **Bundle size** (min+gzip, 1k scatter app) | ⚠️ 108 KB  | ✅ 57 KB | ⚠️ 109 KB  | ✅ 80 KB | ✅ 41 KB  |
| **API stability**                          | ⚠️ v0.38.2 | ⚠️ v0.14 | ⚠️ v0.14   | ✅ v1.6  | ✅ v10    |
| **Headless server-side SVG** (no DOM)      | ✅         | ✅       | ❌         | ❌       | ⚠️ opt-in |
| **Portable JSON spec + schema**            | ✅         | ❌       | ❌         | ❌       | ❌        |
| **CLI validator + renderer**               | ✅         | ❌       | ❌         | ❌       | ❌        |
| **Agent skill**                            | ✅         | ✅       | ❌         | ❌       | ❌        |
| **Automatic temporal detection**           | ✅         | ❌       | ⚠️ Some    | ❌       | ❌        |
| **Built-in interactions**                  | ✅         | ✅       | ⚠️ Some    | ⚠️ Some  | ❌        |
| **ggplot2 API**                            | ✅         | ❌       | ❌         | ❌       | ❌        |
| **Scale, axis & coord control**            | ✅         | ✅       | ✅         | ✅       | ⚠️ d3     |

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
