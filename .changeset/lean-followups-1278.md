---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): lean path — mixed ISO+number columns stay non-temporal; tag lean lifecycle surfaces

- `@ggsvelte/core/render` no longer classifies columns like `["2024-01-01", 5]` as temporal (numbers were epoch-ms near 1970).
- Register `@ggsvelte/core/render`, `@ggsvelte/core/temporal`, and `@ggsvelte/spec/portable` in `lifecycle.json`.
