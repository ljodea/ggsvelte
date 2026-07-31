---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): reject invalid auto-scale timezones early; lean date axes use timeTicks without Temporal

- `assertTemporalConfiguration` still validates `timezone` when the parser is `"auto"` (no more silent fall-through to generic parse failures).
- Lean `@ggsvelte/core/render` date-axis charts fall back to `timeTicks` + `formatTime` when the temporal runtime is not installed, instead of throwing from `planTemporalAxis`.
