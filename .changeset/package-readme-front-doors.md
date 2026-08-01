---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
"@ggsvelte/cli": patch
---

# Refresh package README front doors

Migration: none — package README + skill docs only

Rewrite the npm package READMEs for current APIs; treat them as shipped
surfaces for changesets and CI; execute TypeScript fences in unit tests. Fix
skill prose that still called 0.13.0 grammar-prop removal “planned.”
