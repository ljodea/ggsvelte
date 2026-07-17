---
"@ggsvelte/svelte": minor
---

# Raise the Svelte peer floor to 5.33.1

The `svelte` peer range narrows from `^5.29.0` to `^5.33.1`. Svelte 5.33.1
restored lazy server-side `$derived` evaluation (sveltejs/svelte#15964), so
the library no longer carries wiring constraints for the 5.29 eager behavior.
Only the eager-derived declaration constraint is removed — internal controller
construction order and effect-registration order are unchanged. Consumers on
Svelte 5.29.0–5.33.0 must upgrade Svelte to take this release.
