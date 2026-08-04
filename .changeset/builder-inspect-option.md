---
"@ggsvelte/spec": minor
---

<!-- markdownlint-disable MD041 -->

feat: accept `inspect` on builder layers and geom sugar

The schema and `normalize` have always admitted `inspect: false` (#1068)
and the runtime honors it, but the builder's `LayerInput` types and
`layerFrom` had no key for it — so builder-form specs (gallery examples,
agent-generated charts) could not opt decorative layers out of inspection
without dropping to raw spec objects. `geomRule({ inspect: false })`,
`.layer({ geom, inspect: false, … })`, and every other geom sugar now
carry it into the spec.

Migration: none — additive
