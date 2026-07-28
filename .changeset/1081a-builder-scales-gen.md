---
"@ggsvelte/spec": minor
---

<!-- markdownlint-disable MD041 -->

feat(spec): generate builder scale mixins from SCALE_CAPABILITIES (#1081)

`builder-scales.ts` is now produced by `bun run builder:scales:gen` so every
camelCase ledger helper (plus size/alpha/linewidth/shape ordinal aliases) is a
`GGBuilder` method. Adds the 24 palette constructors that were free-helper-only
(`scaleColorBrewer`, gradients, steps, hue/grey, ordinal, fill twins).

Migration: none — additive
