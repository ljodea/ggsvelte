---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: generate all scale child shells via codegen (#659 slice 4)

Add position and style `<Scale*>` shells (45 new) and regenerate the 18
color/fill shells from a single manifest-driven generator
(`bun run scale:children:gen`). Every `SCALE_CAPABILITIES` family now has a
declaration-only child; `<Scale value={…}/>` remains the escape hatch for
raw/computed fragments. The `scales` prop deprecation already shipped in
slice 3.

Migration: none — additive
