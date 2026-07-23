---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: multi-table DataRef post-merge edges from #603

- Seed named table cache from plot-level named data
- Deduplicate plot+layer named refs in validation maxRows
- Snapshot data on builder .layer()
- Unify binned style binExtent across layers
- Gate legend rowFilters to layers that map the scale field
- Skip globalSourceRows retention on annotation frames
