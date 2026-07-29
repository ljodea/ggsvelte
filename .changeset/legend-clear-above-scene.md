---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): place legend Clear at top-right of the scene, not below

When legend focus commits, the Clear control no longer sits under the
plot with a bottom margin that shoved every chart below. It is absolute
at the top-right of the scene so SVG size stays fixed and layout does
not jump (and the tool-rail strip above the plot stays free).

Migration: none — chrome placement only
