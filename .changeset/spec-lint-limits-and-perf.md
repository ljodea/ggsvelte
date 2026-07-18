---
"@ggsvelte/spec": patch
---

# Honor options.limits in standalone lintSpec, plus lint performance

Standalone `lintSpec` previously always passed the default validate limits to
field-evidence resolution, so raising or lowering `maxRows`/`maxBytes` via
`options.limits` had no effect; it now merges `options.limits` the same way
`validate()` does. Linting also short-circuits `isPortable` on the first issue
and shares field evidence between data checks and lint instead of resolving it
twice.
