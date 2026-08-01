---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): binary-search `ringStarts` for a subpath's hole breaks instead of scanning the whole batch array per point-in-path test (O(R) → O(log R + local) per probe; R grows with polygon feature/hole count in choropleths)
