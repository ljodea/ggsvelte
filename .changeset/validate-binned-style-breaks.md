---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix(spec): validate binned style breaks monotonicity and domain agreement (#599)

Reject binned size/linewidth/alpha/shape/linetype scales whose authored `breaks`
are non-finite or not strictly increasing, and reject specs where both `domain`
and `breaks` are authored with disagreeing endpoints — pre-empting runtime
`style-binned-breaks` / `style-domain-invalid` with targeted validation codes
`scale-binned-breaks` and `scale-binned-domain`.

Migration: none — additive diagnostics for specs that already failed at render
