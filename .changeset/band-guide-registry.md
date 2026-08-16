---
"@ggsvelte/core": patch
---

Headless charts now register the categorical axis planner only when they need a band axis. `@ggsvelte/core/render` and `registerBasic()` still install it.
