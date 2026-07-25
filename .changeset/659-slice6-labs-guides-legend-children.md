---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(#659): labs + guides + legend children, deprecate the props (slice 6)

Ship declaration-only `<Labs>`, `<Guide*>` and `<Legend>` layers — the last
three grammar props to move off `<GGPlot>`.

- `<Labs title x color …/>` — the whole flat Labs surface as named props. No
  `value` escape hatch: `<Labs {...computed} />` already covers it.
- `<GuideAxis/>`, `<GuideLegend/>`, `<GuideColorbar/>`, `<GuideColorsteps/>`,
  `<GuideNone/>` — one shell per guide TYPE, each keyed by a `channel` prop
  (the aesthetic is a key, not part of the component name), plus
  `<Guides value={…}/>` for raw or computed guide bags.
- `<Legend order="sorted"/>` — the plot-wide entry-SORT enum. Deliberately
  separate from `<GuideLegend order={2}/>`, which is a per-aesthetic integer
  placement rank; same word, unrelated concepts.

Deprecates the `labs`, `guides` and `legend` props (since 0.11.0, removable in
0.13.0) with upgrading-guide anchors. Children still win over props (D2).

All three are keyed-MERGE families, so a new `DUPLICATE_MERGE_KEY` composition
advisory fires when two children write the same key — the later one wins, and
siblings touching different keys all survive. `DUPLICATE_SCALE_CHANNEL` keeps
its own code: it shipped in 0.11.0 and its `channel` field and spelling-alias
suggestion are scale-specific. `CompositionDiagnostic` widens accordingly, so
exhaustive `switch`es on `.code` need one new arm.

**Type rename on `@ggsvelte/svelte` only:** the `Labs` spec type is re-exported
there as `LabsSpec`, because the new `<Labs>` component claims the bare name
(every grammar child is named for the PortableSpec field it fills, and `Labs`
is the only spec type without a `Spec`/`Input` suffix). `import type { Labs }
from "@ggsvelte/spec"` is unchanged and remains canonical; only the
`@ggsvelte/svelte` re-export moved. Using the old name against a `Labs` object
is a compile error, not a silent mistype.

Migration: <https://ggsvelte.sh/guide/upgrading#compose-labs-as-a-child-layer>
Migration: <https://ggsvelte.sh/guide/upgrading#compose-guides-as-child-layers>
Migration: <https://ggsvelte.sh/guide/upgrading#compose-legend-as-a-child-layer>
