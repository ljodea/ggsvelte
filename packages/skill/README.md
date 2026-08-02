# @ggsvelte/skill

The ggsvelte agent skill: `SKILL.md` plus deep-dive `references/` that teach a
coding agent the ggsvelte grammar of graphics — Svelte 5 child-component
composition, PortableSpec JSON authoring, and the `validate()` /
`ggsvelte-render` feedback loop.

This package is the one published home of the skill. It versions in lock-step
with [`@ggsvelte/spec`](https://www.npmjs.com/package/@ggsvelte/spec),
[`@ggsvelte/core`](https://www.npmjs.com/package/@ggsvelte/core),
[`@ggsvelte/svelte`](https://www.npmjs.com/package/@ggsvelte/svelte), and
[`@ggsvelte/cli`](https://www.npmjs.com/package/@ggsvelte/cli): a given version
number describes the spec, the renderers, and this skill as of the same
release. Pin it like any other dependency and let dependabot (or
npm-check-updates) tell you when the bundled skill in your repo is stale.

## Install

```sh
bun add -D @ggsvelte/skill
# or: npm install --save-dev @ggsvelte/skill
```

The package root **is** the skill directory: `SKILL.md` sits next to this
README. Skill loaders key off the frontmatter (`name: ggsvelte`), not the
directory name.

## Use

Point your agent at the skill, or copy/symlink it into your agent's skills
directory under the name `ggsvelte`:

```sh
# Claude Code
cp -R node_modules/@ggsvelte/skill .claude/skills/ggsvelte

# pi
cp -R node_modules/@ggsvelte/skill .pi/agent/skills/ggsvelte

# or reference it in place
node_modules/@ggsvelte/skill/SKILL.md
```

Re-run the copy on every version bump (a two-line `postinstall` or a sync
script works); the dependabot PR is the signal that the skill changed.

The skill assumes the agent can also run
[`@ggsvelte/cli`](https://www.npmjs.com/package/@ggsvelte/cli)
(`ggsvelte-render`) for spec validation and headless SVG rendering — install it
in every sandbox where an agent authors specs.

## Contents

- `SKILL.md` — trigger conditions, layer ontology, authoring workflow.
- `references/` — geoms and stats, scales and palettes, themes, interactions,
  composition surfaces, recipes.

## Guarantees

The skill cannot quietly fall behind the library: CI fails any PR that adds a
geom, stat, position, theme, or color scheme to `@ggsvelte/spec` without
documenting it here, and every fenced JSON example in the skill is normalized
and validated against the current spec.
