---
"@ggsvelte/core": patch
---

# Read a band selection's ends without mapping every key

Migration: none — internal

`SemanticViewport.resolve` reports the first and last selected values on a band
axis. It got them by mapping the whole key list through a `flatMap` used as a
filter, allocating a short-lived array per key to read two values. It now scans
inward from each end.

Scope honestly: this is an allocation cleanup on a cold path, not a hot-path
win. The only in-tree caller is the precise-bounds editor's apply handler, which
calls `project` on the same selection a few lines later — and that still walks
every key, doing more per key than the loop removed here. What this buys is
simpler code and no per-key garbage; `SemanticViewportPanel` is exported, so
external callers get it too.

Behaviour is unchanged: a key the axis does not carry is skipped exactly as the
map step dropped it, one match is both ends, and no match is still undefined.
