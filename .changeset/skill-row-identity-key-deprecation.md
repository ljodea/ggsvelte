---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

# Teach v0.21 row identity; mark plot-level key deprecated

Migration: none — skill docs only

SKILL.md still listed `key` as a first-class GGPlot prop and told agents to
always give a stable key after #1254/#1257 moved durable identity onto
Inspect / Select / createPlotInteraction. Align the lead skill with
references/interactions.md so agents stop generating the deprecated surface.
