---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): emit dual-channel scale diagnostics from structured facts

Scale-training rich diagnostics (break-outside-domain, baseline transformed
origin) are built at emission time with typed facts. Evidence is no longer
recovered by parsing human-readable warning messages. Catalog completeness
is primary via a typed emission registry (#628).
