---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
---

# Speed lean column parse, grouping, and canvas mark paint

Migration: none — same scene geometry, group ids, and portable cell values for non-Date columns (still snapshot-isolated from caller mutation).

Cut per-mount cost on competitive multi-series / scatter paths: lean `parsed()` no longer double-coerces nominal columns; pure number and pure non-ISO string columns take monomorphic fast paths; `isoEpochMs` rejects short labels before the regex; group id materialization avoids `Array.from` on 30k typed arrays; explicit `aes.group` skips unused discreteness probes; builder column snapshots use `slice` and share non-Date portable arrays; canvas points bucket interleaved categorical colors; solid path strokes skip unused `subpathBounds` scans.
