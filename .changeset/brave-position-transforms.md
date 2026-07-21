---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Pre-stat position transforms and positional scale families

Add canonical identity, log10, and square-root position transforms; continuous and binned scale helpers with ggplot2 aliases; source-limit OOB policies; transformed-space stats/positions; semantic guides and interaction inversion; binned count/stack/dodge identities; and default 5% non-temporal expansion.

Migration: <https://ljodea.github.io/ggsvelte/guide/upgrading#0-4-to-0-5>

Authored `type: "log"` now canonicalizes to `{ type: "linear", transform: "log10" }` and runs before statistics. Pinned domains censor before stats by default, position and numeric-bin parameters use transformed-space units, and trained/guide/interaction contracts report family `linear` plus `transform`. Use `expand: { mult: 0, add: 0 }` for flush bounds.
