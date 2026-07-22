---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: train uncensored natural baseline when scale domain pins censor

`runPipeline` with `baselineScales` and explicit x/y domains now trains
baseline domains from a second prepare/train pass without domain pins, so
zoom-out references match full data extent (Svelte double-pass parity).
