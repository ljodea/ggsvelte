---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix(spec): require channels for label, hex, bin_2d, qq, and qq_line

Tier-2 validation listed only 43 of 49 geoms in `REQUIRED_CHANNELS`, so
`label` (unlike `text`) accepted a missing `label` channel, and `hex`,
`bin_2d`, `qq`, and `qq_line` required nothing. The table is now total over
`GeomName`; `AES_CHANNEL_KEYS` is derived from `CHANNELS` so path mapping
cannot lag the catalog.

Migration: specs that omit required channels for those geoms will start
failing `validate(spec, {})` with `missing-required-channel` — map the
channels (or fix the geom). Annotation-only `abline` is unchanged.
