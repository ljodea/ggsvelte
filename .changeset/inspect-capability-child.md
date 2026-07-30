---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(svelte): declaration-only `<Inspect>` host capability child

Enable inspection with `<Inspect />` / `<Inspect mode="xy" />` inside
`<GGPlot>` instead of (or as well as) the `inspect` prop. Host-only — never
part of PortableSpec. Mark eligibility stays `inspect={false}` opt-out on
geoms. Multiple `<Inspect>` children last-win with an advisory.

Migration: none — additive; prop form still works. Prefer:

```svelte
<GGPlot data={rows} aes={{ x: "x", y: "y" }}>
  <Inspect />
  <GeomPoint />
</GGPlot>
```
