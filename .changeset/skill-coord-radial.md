---
"@ggsvelte/skill": patch
---

# Document CoordRadial and CoordPolar in the agent skill

Migration: none — skill reference prose only; no API change.

Teach agents the polar/radial coordinate shells added in 0.31: component
roster (`CoordRadial`, `CoordPolar`), PortableSpec `type: "radial"`, options
(`theta`, `start`/`end`, `innerRadius`, `expand`, `clip`, `reverse`, limits),
and the ggplot2 `coord_polar` alias defaults (clip on; prefer radial for new
work).
