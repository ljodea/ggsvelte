---
"@ggsvelte/core": minor
"@ggsvelte/svelte": patch
---

# Use CandidateStore for all hit resolution

Add paint-ordered `CandidateStore.hitTest()` and route Svelte pointer inspection
through the render model's existing lazy candidate index. Remove the experimental
`buildHitIndex` and related `@ggsvelte/core/dom` types so interactive plots no
longer build and retain a second geometry index.

Migration: <https://ljodea.github.io/ggsvelte/guide/upgrading#0-2-to-0-3>
