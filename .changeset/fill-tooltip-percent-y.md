---
"@ggsvelte/core": patch
"@ggsvelte/cli": patch
"@ggsvelte/svelte": patch
"@ggsvelte/spec": patch
"@ggsvelte/skill": patch
---

Fix position-fill tooltips that printed absurd percentages (e.g. "87300%") by publishing post-position proportions as candidate y values, and emit a `percent-labels-out-of-range` advisory when scale labels are percent formats on non-proportion domains.
