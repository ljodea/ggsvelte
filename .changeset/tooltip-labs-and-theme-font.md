---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: default tooltips use labs titles and theme font size

- Default tooltip field labels prefer explicit `labs` titles for x/y/color/fill
  (and other aesthetic lab keys), then lightly humanized column names.
- Tooltip type size tracks `theme.fontSize` instead of a hard-coded 12.5px
  (residual of #753 hierarchy work).

Migration: none. Charts with `labs` get more readable default tooltips; custom
`inspect.content` snippets remain fully author-controlled.
