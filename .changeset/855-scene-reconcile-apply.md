---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor(svelte): thin scene-reconcile apply out of InspectionState $effect

`applySceneInspectReconcile(plan, bag)` owns the clear-disabled / invalidate-*
side-effect table; the factory `$effect` is a short plan → apply shell (#855).
