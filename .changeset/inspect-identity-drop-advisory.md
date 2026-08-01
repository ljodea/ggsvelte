---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: warn when an `<Inspect>` child drops the inspect prop's `identity`

`<GGPlot inspect={{ identity: "year" }}><Inspect /></GGPlot>` used to lose the
`identity` without a word. The child replaces the prop whole (REPLACE, as
documented), an empty child bag means `inspect={true}`, and row identity then
fell back to an `id` column or the row index — so pins and selection keys
silently rebound to the wrong rows.

The capability seam now resolves row identity itself and reports the loss as
`INTERACTION_INSPECT_IDENTITY_DROPPED`. A child that names its own `identity`
is a deliberate override and stays quiet. REPLACE semantics are unchanged;
only the silence is gone.
