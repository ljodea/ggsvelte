---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(#770): prefer exact hits over path x-snap under inspect auto

Under `inspect` auto mode, `CandidateStore.nearest` no longer lets
path/smooth axis-snap distance beat co-layered point ring hits. Exact-mode
geometric hits win first; pure x/y snap still applies when nothing exact is
under the pointer (line-only charts unchanged). Explicit `mode: "x"|"y"|"xy"`
is unchanged.

Migration: none. Scatter + smooth with boolean/`auto` inspect now focuses
points on hover instead of the trend line's full-panel vertical crosshair.
