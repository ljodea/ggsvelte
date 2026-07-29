---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

docs(skill): keep SKILL.md scheme/theme lead counts in sync with registries

Slim the theme lead line to representative names, and assert scheme/theme
totals (plus reference section headers and example names) against
`COLOR_SCHEME_NAMES` / `CATEGORICAL_SCHEME_NAMES` / `SEQUENTIAL_SCHEME_NAMES`
and product `THEME_NAMES` in `scripts/skill-content.test.ts` so ggthemes
port PRs cannot leave the agent skill summary stale (#1210).
