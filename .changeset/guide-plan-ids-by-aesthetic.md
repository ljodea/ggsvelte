---
"@ggsvelte/core": patch
---

# Index guide plans by aesthetic once when assembling the render model

Migration: none — same guidePlanIds assignment and plan-list order on every scale decision.

Pre-bucket plan ids by aesthetic so each decision indexes the bucket instead of rescanning the full guide plan list (O(D×P) → O(P+D)).
