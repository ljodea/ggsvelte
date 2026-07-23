---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: remaining multi-table edges after per-layer DataRef

Binned axes and fixed histogram bin ranges read each layer filtered table;
transform diagnostics count filtered (not unfiltered) rows; scale validation
keeps per-layer field evidence; boxplot outlier lineage is not double-remapped
under facets; Svelte identity epochs fingerprint geom-child data props.

Migration: none — corrects multi-table behavior under per-layer data
