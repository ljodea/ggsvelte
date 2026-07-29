---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

perf(spec): precompute reference catalogs off TypeBox

Ship GEOM_REFERENCE, SCALE_REFERENCE, STAT/POSITION/GUIDE catalogs and
GEOM_PARAM_KEYS as generated plain data so docs SSR and createGeomLayer
never load SpecDeclarations. Rebuild with `bun run reference:catalogs:gen`.
