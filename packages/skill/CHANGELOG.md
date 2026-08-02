# @ggsvelte/skill

## 0.27.0

### Minor Changes

- 2effe5c: # Skill moved to @ggsvelte/skill

  Migration: <https://ggsvelte.sh/guide/upgrading#skill-moved-to-ggsvelte-skill>

  The agent skill is now its own package, `@ggsvelte/skill`, versioned in lock-step with the rest of ggsvelte. The package root is the skill directory: install it and copy/symlink `node_modules/@ggsvelte/skill` into your agent's skills directory as `ggsvelte/`, or point agents at `node_modules/@ggsvelte/skill/SKILL.md` directly. Dependabot now surfaces skill updates for bundled copies.

  **Breaking (pre-1.0):** `@ggsvelte/svelte` no longer bundles the skill — `node_modules/@ggsvelte/svelte/skills/ggsvelte/` is gone. Migrate by adding `@ggsvelte/skill` as a (dev) dependency and copying from there instead.
