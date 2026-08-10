---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/skill": minor
---

# Add Crameri Scientific colour maps (continuous suite)

Ship Fabio Crameri’s Scientific colour maps v8.0.1 as named sequential schemes
(`batlow`, `vik`, `oleron`, … — 35 continuous maps). Use them like any other
ramp:

```ts
scaleFillContinuous({ scheme: "batlow" });
```

```svelte
<ScaleFillContinuous scheme="batlow" />
```

Migration: none — additive. Cyclic (`*O`) and categorical (`*S`) maps are not
included yet.
