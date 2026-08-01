---
"@ggsvelte/core": minor
"@ggsvelte/svelte": patch
---

# Bucket batches by panel once per render

Migration: none — additive

`SceneView` nested a loop over batches inside its loop over panels, deciding
membership with a per-pair `batch.panelIndex === i`. Batch count itself grows
with panel count — the pipeline emits per layer per panel — so the product grew
roughly with layers times panels squared.

The SVG-string renderer and the canvas renderer already grouped once (issue 185) through `groupBatchesByPanel`, which was reachable only from
`@ggsvelte/core/dom`. It is pure, so it now sits on `@ggsvelte/core` and all
three renderers share one copy of the routing rule rather than three.

Measured element reads of the batch list per render, with 24 batches: 2 panels
48, 4 panels 96, 12 panels 288, 24 panels 576 before; 24 at every panel count
after.
