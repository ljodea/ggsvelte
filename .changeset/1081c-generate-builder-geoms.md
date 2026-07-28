---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

refactor(spec): generate builder geom mixins from KNOWN_GEOMS (#1081)

`builder-geoms.ts` is produced by `bun run builder:geoms:gen` so every catalog
geom is a `GGBuilder` method. `geomJitter` keeps its special width/height/seed
assembly. Composition is `WithBuilderScales(WithBuilderGeoms(GGBuilderCore))`.

Migration: none — additive tooling / internal layout; public methods unchanged.
