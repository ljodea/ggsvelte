---
"@ggsvelte/core": minor
---

New `@ggsvelte/core/svg-live` entry: `mountSceneSvg(root, scene)` mounts a computed scene as live, patchable SVG. `update(nextScene)` diffs the scene against the mounted one and patches attributes positionally in place — same-skeleton data updates no longer re-render the string and swap the DOM subtree; any structural change (signature mismatch) falls back to a full remount, so output is always identical to a fresh render. Intended for interactive/live-update hosts; initial mount reuses the string renderer, so mount cost and output are unchanged.

Migration: none — additive entry point. `renderToSVGString` behavior is unchanged.
