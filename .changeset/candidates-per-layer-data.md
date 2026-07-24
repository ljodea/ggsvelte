---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

Fix interaction on plots where a layer carries its own `data`. Candidate value
resolution looked every mapped field up in the plot's source table, so hovering
a chart whose band or annotation layer had its own columns threw
`ColumnTable: unknown field "..."`. Row ids are global across sources, so the
owning table is now resolved from the row.

Migration: none — additive
