---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Add scale_x_time / scale_y_time time-of-day position scales (#831)

- New `temporalKind: "time"` for time-of-day (distinct from date/datetime)
- Helpers: `scaleXTime` / `scaleYTime` / `scale_x_time` / `scale_y_time` + builder methods
- Portable numbers are **seconds since midnight** → epoch ms on 1970-01-01Z; Date values use UTC clock portion
- Default axis labels use `%H:%M:%S`; tick intervals prefer hour/minute/second
- Svelte: `<ScaleXTime />` / `<ScaleYTime />`

Migration: none — additive
