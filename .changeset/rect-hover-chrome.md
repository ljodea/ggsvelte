---
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: geom_col/bar hover uses relative de-emphasis instead of a point ring

Rect mark inspection no longer draws a circle hover/selection ring at the bar
anchor. Sibling bars de-emphasize via interaction masks (including keyless
charts via seed primitive focus). Point-like geoms keep circle chrome.
