---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

perf: Θ(R·B)→Θ(R) binned rect edges via xBinId

Identity/count bar-col geometry on `type: "binned"` recovers bin edges from the
stable integer `xBinId` (frame construction) instead of per-row
`centers.findIndex` scans (B ≤ MAX_BINNED_BREAKS).
