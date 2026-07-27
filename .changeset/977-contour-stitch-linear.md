---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): O(E) contour polyline stitch (no Array.unshift)

Backward isoline extend used `chain.unshift` per edge and re-filtered
adjacency for degree-1 seeds. Push into a prefix + reverse once, and keep
remaining degrees + an endpoint-edge stack so stitch is linear in edge count.
