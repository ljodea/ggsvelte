---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: channel-wide censor recovery for temporal numeric styles

parseFailure: "censor" on size/linewidth/alpha now recovers all-invalid
fields and constants when a sibling field or scaled constant trains the
shared scale (parity with runtime channel collection).
