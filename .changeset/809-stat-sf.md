---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat: public stat_sf as geom_sf default (#809 phase 7)

Add `KNOWN_STATS` value `"sf"` (ggplot2 `stat_sf` geometry expand) as the
default for `geom_sf`, and route expand through the normal non-identity stat
path instead of a geom-only special case.

`normalize()` rewrites legacy portable `stat: "identity"` on `geom_sf` to
`stat: "sf"`; draw/hit behavior is unchanged. Canonical stamps use `"sf"`.

Migration: none — additive
