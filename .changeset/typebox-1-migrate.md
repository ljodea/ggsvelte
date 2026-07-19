---
"@ggsvelte/spec": patch
---

# Migrate schema runtime from @sinclair/typebox 0.x LTS to typebox 1.x

Replace the LTS `@sinclair/typebox` package with the active `typebox` 1.x line
(same author; official Latest). Regenerates `schema/v0.json` and rewires
runtime validation/error mapping for the 1.x Value API. PortableSpec shapes
and the public validate()/builder surface are unchanged.
