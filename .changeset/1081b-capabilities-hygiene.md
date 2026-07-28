---
"@ggsvelte/spec": minor
---

<!-- markdownlint-disable MD041 -->

feat(spec): export scale helper inventory from SCALE_CAPABILITIES (#1081)

Public inventory helpers for the capability ledger: `scaleCapabilityCamelHelpers`,
`STYLE_ORDINAL_SCALE_HELPERS`, and `builderScaleHelperNames`. Generator scripts
(`builder:scales`, `scale:children`) now share this package surface so helper
name sets are not re-derived by hand.

Migration: none — additive
