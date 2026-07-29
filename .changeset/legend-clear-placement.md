---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): park legend Clear under the pressed guide, not the scene corner

The recovery control used a fixed top-right scene park that often covered
legend titles and swatch labels. It now anchors to the pressed legend box
(below right stacks, beside bottom strips), uses compact row height instead
of a 44×44 slab, and fades after idle leave so committed screenshots stay
clean. Hover or focus on legend chrome brings it back.

Migration: none — interaction chrome only
