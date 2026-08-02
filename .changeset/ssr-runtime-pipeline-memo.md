---
"@ggsvelte/svelte": patch
---

# Memoize SSR plot model and strata for one server pass

Migration: none — same SSR markup; the server path no longer re-runs the
pipeline on every `model` / `strata` / `hasCanvas` getter read within a render.
