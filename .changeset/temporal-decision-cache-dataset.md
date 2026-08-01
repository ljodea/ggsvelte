---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

# Temporal decision cache keys by dataset evidence

Migration: none — internal

Multi-layer validation reused the first temporal decision for a field name across
layers that read different datasets. The memo now keys by FieldEvidenceEntry
identity so same-named fields keep independent temporal decisions.
