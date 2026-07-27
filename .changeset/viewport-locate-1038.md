---
"@ggsvelte/core": minor
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

Semantic viewport owns client→plot mapping via `locate`; surface deletes `plot-px`.

`SemanticViewport.locate(clientX, clientY, rect)` maps capture-element client coordinates into scene pixels (CSS scale, zero-size guard, no OOB clamp). `createSemanticViewport` now takes a single options object including `sceneSize`. Interaction `setInspection` takes `CandidateFacts` only — `SceneHit` / `hitFromCandidate` / `plot-px` are gone (were never public exports).

Migration: none — additive
