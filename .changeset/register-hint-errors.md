---
"@ggsvelte/core": patch
---

# Not-registered errors name the family register function

When a specialty stat/geom is missing from the build, the thrown error now names the precise fix — `registerSummary()`, `registerViolin()`, `registerHex()`, … (exported from both `@ggsvelte/core` and `@ggsvelte/svelte`) — instead of only the broad `registerAll()` / `registerBasic()` advice, and no longer suggests `registerBasic()` for specialty names it cannot cover. Non-obvious families map correctly (`bin_hex` → `registerHex()`, `ydensity` → `registerViolin()`, `bindot` → `registerDotplot()`). The hint maps are pure strings so the lean `@ggsvelte/core/render` graph stays free of the registration modules, with drift-guard tests keeping them in sync with the `register-*.ts` family modules.
