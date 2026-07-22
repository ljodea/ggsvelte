---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor: extract candidate nearest-nav helpers

Move closestOrthInRange / directionalNearestInOrder / panelRangeInOrder into
candidate-geometry-nearest.ts. Re-exports keep existing import paths working.
