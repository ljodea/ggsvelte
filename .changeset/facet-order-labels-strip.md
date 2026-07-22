---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Facet value order, labels, and strip position

Extend facet field configuration with JSON-serializable options for closed panel order, display labels, and strip placement (issue #590).

- `facet.wrap|rows|cols.levels` — closed explicit panel order (empty panels for missing levels; unknown data values diagnosed and excluded)
- `facet.wrap|rows|cols.labels` — display-label map (identity keys stay semantic)
- `facet.strip.position` — `top` (default) | `bottom` | `left` | `right`; left/right bands are measured and reserved in layout
- `facet.strip.show` — set `false` to hide strip chrome when labels are authored elsewhere

Migration: none — additive; defaults preserve ascending sort and top strips.
