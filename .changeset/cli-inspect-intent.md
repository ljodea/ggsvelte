---
"@ggsvelte/core": minor
"@ggsvelte/cli": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": minor
---

# CLI host inspect intent (`--inspect`) closes the agent interaction gap

Agents that only run `ggsvelte-render` never saw inspect×geom advisories
(`INTERACTION_INSPECT_X_ON_COL`, …) because those fired only through Svelte
`ondiagnostic`. Inspect mode stays host-only (not PortableSpec).

- `ggsvelte-render --inspect auto|exact|x|y|xy` declares host intent and emits
  bar/col x-guide pure-collector codes on stderr with `source: "interaction"`.
- Pure collectors and catalog messages for those codes live in `@ggsvelte/core`
  (`collectInspectIntentDiagnostics`, `INSPECT_GEOM_DIAGNOSTIC_CATALOG`); the
  Svelte host re-exports them so host and CLI share one implementation.
- Alias geoms (`histogram`→`bar`) are rewritten so CLI matches host normalize.
- Skill + CLI README document what the CLI covers vs host-only interaction.

Migration: none — additive. Default render without `--inspect` is unchanged.
