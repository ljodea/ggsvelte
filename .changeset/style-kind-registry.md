---
"@ggsvelte/core": patch
---

Headless charts now register size/shape style scale families only when they map those aesthetics. `@ggsvelte/core/render` and `registerBasic()` still install both families.
