---
"@ggsvelte/spec": patch
---

# Keep RuntimeSpec aligned with PortableSpec

Project the runtime plot and layer types from their portable counterparts so
portable fields such as `edition`, `facet`, `coord`, `a11y`, and layer `render`
are visible through `RuntimeSpec`. Runtime-only `{ fn }` channel accessors remain
type-level and conversion features; the rendering pipeline does not execute
them.
