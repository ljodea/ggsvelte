---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

refactor(spec): extract style scale data checks from dataChecks

Move shape/linetype and size/linewidth/alpha scale compatibility (including
temporal numeric styles and scaled constants) into validate-data-checks-style.ts
so style-scale work no longer lands in the dataChecks layer-walk orchestrator.
Public validate() behavior is unchanged.
