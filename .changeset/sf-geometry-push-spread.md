---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

# Push sf geometry leaves without spreading large arrays

Migration: none — internal

`expandSfLeaves` and `representativePointsForGeometry` used `out.push(...items)`.
Past the engine argument limit a large nested GeometryCollection or MultiPoint
threw `RangeError`. Leaves and points are now pushed one element at a time.
