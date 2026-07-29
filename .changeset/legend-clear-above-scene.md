---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): place legend Clear above the scene, not below

When legend focus commits, the Clear control no longer sits under the
plot with a bottom margin that shoved every chart below. It is absolute
above the scene so SVG size stays fixed and layout does not jump.

Migration: none — chrome placement only
