---
"@ggsvelte/core": minor
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

feat: multi-part SF labels via stat_sf_coordinates (#809 phase 5)

MultiPoint / MultiLineString / MultiPolygon expand to one label per geometry
part (exterior centroid / vertex mean). Duplicates feature aesthetics onto each
part.

Migration: Multi* features that previously got a single first-component label
now get one label per part.
