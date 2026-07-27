---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor(svelte): extract pure data-identity epoch input builder

Move markLayers-vs-layers-prop, ready-without-assembled, and explicit-spec
content pick into buildDataIdentityEpochInput next to dataIdentityEpochToken.
plot-engine keeps the tracker and $derived call site.
