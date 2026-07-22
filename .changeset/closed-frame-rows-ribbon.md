---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: closed ribbons map coord semantic indices via emitted frame rows

Area/density/smooth closed bands attach `closedFrameRows` for each
pre-projection vertex so candidate frame-row resolve survives non-finite edge
filtering under `coordTransform`.
