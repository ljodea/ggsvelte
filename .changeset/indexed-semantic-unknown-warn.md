---
"@ggsvelte/core": patch
---

# Index batch semantics when counting unknown scale values

Binned color and sequential/binned numeric style scales count unknown training
values from the batch-parsed `view.semantic` array instead of re-deriving each
row via `semanticOf` (which re-paid encodeKey lookup or single-row parseColumn
on temporal misses). Warning counts stay the same.
