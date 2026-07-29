# Domain glossary

## Layer

In ggsvelte, a **layer** is any declaration-only child that registers into the
plot layer registry. The Svelte `Layer` union is:

- `mark` — geom/stat/position marks (`<GeomPoint>`, …)
- `scale` — `<Scale*>`, escape-hatch `<Scale>`
- `theme` — `<Theme*>`, escape-hatch `<Theme>`
- `coord` — `<Coord*>`, escape-hatch `<Coord>`
- `facet` — `<Facet*>`, escape-hatch `<Facet>`
- `labs` — `<Labs>`
- `guides` — `<Guide*>`, escape-hatch `<Guides>`
- `legend` — plot-wide `<Legend>` entry-sort options

All of those are layers. “Non-mark” / “grammar family” means “not a geom mark,”
not “not a layer.” Component comments and `#659` upgrade anchors say “child
layer” on purpose.

**PortableSpec dual vocabulary:** JSON `PortableSpec.layers[]` holds **mark
layers only**. Scales, theme, coord, facet, labs, guides, and legend fold into
sibling top-level keys. That is serialization shape for the agent/headless
path — not a claim that those families are outside the layer model.

Never write “non-layer grammar components” for Scale/Theme/Guide/Labs/Coord/
Facet/Legend. Prefer “grammar layers” or “non-mark layers.”

## Semantic viewport

The plot-owned mapping between panel pixels and semantic axis values. It owns panel identity, coordinate transforms, axis reversal, coordinate flipping, and panel-local scale selection so interaction callers do not reconstruct that mapping from rendering details.
