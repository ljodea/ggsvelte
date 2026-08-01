---
"@ggsvelte/core": patch
---

# Build a band axis index once per scale, not once per panel

Migration: none — internal

Under the default fixed facet scales every panel is handed the same trained
`PositionScale` object, but the semantic viewport built that scale's key→value
index separately for each one. A plot with P panels over an axis of C
categories walked the same domain P times and kept P copies of the resulting
map alive for as long as the render model. Both quantities grow with the data,
so the cost was O(P×C) where O(P+C) does.

The viewport now memoises the index on the scale object itself, so panels that
share a scale share one map. Free facet scales give each panel its own scale
object and so still get their own index; nothing writes to the map after it is
built.

Scope honestly: this is construction work, not a per-row or per-pointer term —
it runs once when the render model is assembled. Results from `resolve`,
`project`, and `locate` are unchanged.
