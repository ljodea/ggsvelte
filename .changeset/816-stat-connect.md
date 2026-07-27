---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

# feat: stat_connect named path joins for path/line (#816)

Add `stat: "connect"` on path and line with `params.connection`
(`hv` default, `vh`, `mid`, `linear`). Expands successive finite
points into intermediate vertices so stepped/path displays do not
rely on geom curve flags alone.

Path uses data order; line expands after x-sort and skips post-stat
x-sort so tied-x elbows stay intact. Custom connection matrices
deferred.

Migration: none — additive
