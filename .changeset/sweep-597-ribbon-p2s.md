---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: ribbon temporal preflight, band measure drop, outline focus mute

- Preflight xmin/xmax only for rect/ribbon (not unused point mappings)
- Drop ribbon rows when measure projection is non-finite (band measure axes)
- Mirror fill focus masks onto presentation-only ribbon outline batches
