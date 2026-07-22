---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: align temporal color censor recovery with runtime channel training

parseFailure: "censor" on sequential/binned color now recovers from
channel-wide training sources (sibling fields, scaled constants), parseable
domain endpoints, and parseable binned breaks — matching collectColorChannelValues
and sequential/binned train behavior.
