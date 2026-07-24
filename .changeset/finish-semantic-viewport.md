---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: finish semantic viewport encapsulation for zoom + bounds edit

Add `normalizedSpan` and `axisEditModel` on the model-owned semantic
viewport so zoom degeneracy guards and interval bounds editing no longer
reconstruct pixel normalization, axis reversal, or band slicing from raw
`PositionScale` details.

Migration: none for plot authors. Interaction callers that previously
read `model.scales` for bounds-edit math should use
`viewport.panel(id).axisEditModel(axis)` and `panel.normalizedSpan(rect)`.
