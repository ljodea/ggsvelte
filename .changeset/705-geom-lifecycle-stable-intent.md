---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

lifecycle: promote Geom* declaration-only shells to stable-intent (#705)

Tag every public `<Geom*>` component stable-intent so the recommended Svelte
composition path matches theme/scale/coord grammar children. Registry and
factory helpers stay experimental. Tag-only change — no runtime API change.

Migration: none — additive
