---
"@ggsvelte/core": patch
---

Categorical color and fill scale training now skips redundant catalog lookups across adjacent runs, reducing pipeline time for long-form series data without changing first-seen scale domains.
