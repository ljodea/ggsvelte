---
"@ggsvelte/svelte": patch
---

Omit aes.weight from the default tooltip body — y already carries the weighted measure for count/sum bars, so printing the source weight column was pure redundancy.
