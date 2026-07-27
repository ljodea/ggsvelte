---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor(core): inline empty pipeline barrels and type satellites

Delete pure re-export facades and one-type satellites in packages/core
pipeline. Collapse panel-layout from 34 files to 7 by inlining sole-importer
modules into chrome, facet, single, and the orchestrator.
