---
"@ggsvelte/core": patch
---

Headless charts now register color scale kinds the same way they register geoms. `@ggsvelte/core/render` and `registerBasic()` still install every kind.
