---
"@ggsvelte/svelte": patch
---

# GeomLabel boxes paint in the live Svelte scene

Migration: none. GeomLabel already emitted box geometry in the pipeline and the pure SVG-string serializer; the live Svelte Batch scene path only drew the text. Docs and index thumbnails now show the rounded box chrome.
