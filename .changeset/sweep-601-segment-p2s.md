---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: segment endpoint grouping, binned extent, auto-hit, validation

- Exclude xend/yend from default discrete grouping
- Gate binned-axis endpoint fields to segment layers only
- Preserve geometry-based auto hit mode for geom segment
- Reject non-field segment endpoint mappings at validate time
