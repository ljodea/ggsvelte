---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor(core): one constructor for post-stat LayerFrame

`statLayerFrame` owns the shared post-stat frame fields, yStatColumn default,
measure forward, NO_ROW lineage, and style/extras spreads. Matching
`frame-stats-*` adapters call it instead of hand-writing the same literal.
function/map/manual/unique/sf stay on their own shapes until a later pass.
