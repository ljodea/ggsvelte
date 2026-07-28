---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(inspect): let a layer opt out of inspection

An area mark reports distance 0 everywhere it is painted, so a full-panel
background band outranks every point and stroke beneath it: the tooltip binds to
the band and the reader can never reach the data. Set `inspect={false}` on that
layer (or `"inspect": false` in the spec) and its marks never become tooltip,
hover, or keyboard-traversal candidates.

It travels with the spec, so a JSON round trip and a headless render agree with
the browser. Rect hit maths is unchanged, so layers that want an area tooltip —
bars, tiles, heatmaps — keep one.

Migration: none. Omitting the field keeps today's behaviour.
