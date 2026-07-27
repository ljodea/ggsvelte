---
"@ggsvelte/svelte": patch
---

# Escape discard of pending pin stash

Escape (and setInspection clear) now discard the pending pin-restore stash so a later re-pin cannot restore a pre-dismiss candidate (#856).
