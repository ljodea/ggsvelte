---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

spec/core: give the post-normalize geom a type the compiler can check (#1042)

`normalize()` rewrites five convenience geoms away — `histogram` to `bar`,
`freqpoly` to `line`, `jitter` to `point`, `hline` and `vline` to `rule` — so
only 44 of the 49 names reach the render pipeline. Its return type still named
all 49, which is why every per-geom switch in core needed a `default:` arm. A
geom missing from one of them rendered nothing, or got the wrong inspect mode,
in silence.

The alias rewrite is now data: `ALIAS_GEOMS` and `GEOM_ALIASES` in
`@ggsvelte/spec`, with `NormalizedGeomName`, `NormalizedLayerSpec` and
`NormalizedSpec` derived from them. `normalize()` returns `NormalizedSpec` and
core carries that type through binding, so the two big switches and the
path-projection table are exhaustive: a new geom is a compile error until every
one of them names it.

`PortableSpec` and the emitted JSON Schema are unchanged — `histogram` and the
rest are still legal input. `STAT_Y_COLUMNS` is now keyed by `StatName` and
total, which names the ten stats that publish no y-mappable column instead of
hiding them behind a `?? []`.

Also fixes a geom lookup that walked the prototype chain. A layer named after
an inherited `Object` property — `geom: "constructor"`, `"toString"`,
`"valueOf"` — lost its `stat` and `position` in `normalize()` and then failed
validation with a shape error instead of the `unknown-geom` did-you-mean the
error contract promises. Every geom name is now an own-key lookup.

Migration: <https://ggsvelte.sh/guide/upgrading#0-12-to-0-13>
