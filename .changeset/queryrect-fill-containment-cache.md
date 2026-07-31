---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf(core): cache filled-path containment per brush rect in queryRect — an interior brush over a filled area/polygon ran a full point-in-polygon walk per candidate (O(K×V)); one cached walk per subpath per query (O(K+V))
