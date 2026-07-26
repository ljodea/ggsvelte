---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

docs(#659): teach the child-layer API in the guide (slice 9)

Every Svelte snippet outside the upgrading page now composes scales, guides,
coordinates, facets, labels, and themes as children rather than as the props
deprecated in 0.11.0, and the copy-ready snippets on the themes page follow.
The upgrading guide keeps the old form on purpose — it is the page that
migrates away from it — and a guard asserts that exemption stays earned.
