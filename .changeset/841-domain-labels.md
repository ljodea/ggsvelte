---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

refactor(core): host disambiguatedLabels next to domain labeling

Move the scale-domain label helper out of legend layout builders into
domain-labels.ts. Public export and legend re-export stay stable.
