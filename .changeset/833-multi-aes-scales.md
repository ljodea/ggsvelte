---
"@ggsvelte/spec": minor
---

<!-- markdownlint-disable MD041 -->

feat(#833): multi-aes identity/manual helpers + scaleType

Add `scale_continuous_identity`, `scale_discrete_identity`, and
`scale_discrete_manual` that expand across aesthetics into PortableSpec
`scales`, plus a small `scaleType()` registry for default family selection.
