---
"@ggsvelte/skill": patch
---

# Skill teaches the stat-override registration contract

docs(skill): teach the stat-override registration contract (#1420). `<Geom*>` children self-register only their DEFAULT stat; the stat usage patterns, the errorbar `stat="summary"` recipe, and the SKILL.md preamble now name the matching `register<Family>()` calls from `@ggsvelte/svelte` (and `registerAll()` for spec-driven surfaces). Agents following the skill previously produced apps that threw "not registered in this build" for `stat="…"` overrides.
