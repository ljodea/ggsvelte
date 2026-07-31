---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): auto-align sparse stacked-area groups instead of rendering floating polygons

Stacked area groups whose continuous x samples skip an interior grid point
used to chord straight across the hole while the stack below varied,
rendering disembodied polygons — silently. The default identity path now
auto-applies the align stat (interpolate between a group's observed samples,
zero outside its range) and emits a `stack-align-applied` advisory. The
rescue stands down when the x scale may train discrete or a group repeats an
x value, so existing correct plots keep their geometry.
