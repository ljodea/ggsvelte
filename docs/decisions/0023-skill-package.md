# 0023 — the agent skill becomes its own package (`@ggsvelte/skill`)

Date: 2026-08-02. Status: accepted.

## Problem

The ggsvelte agent skill (`SKILL.md` + `references/`) lived in two
byte-identical copies: `skills/ggsvelte/` at the repo root and
`packages/svelte/skills/ggsvelte/` inside the `@ggsvelte/svelte` npm package,
kept in sync by a test plus a manual rsync. That packaging failed the skill's
primary audience — agents, and the developers who bundle skills for them:

1. **No version signal.** A consumer who copied the skill into
   `.claude/skills/` had no way to learn it went stale. Bundling the skill
   inside `@ggsvelte/svelte` tied its "version" to a package most agent
   sandboxes never install (decision 0022 already established that the svelte
   package is the wrong shape for agent environments).
2. **No lock-step forcing function.** Skill updates depended on humans
   remembering to rsync a second copy. Agents editing the spec routinely left
   the skill behind; only the inventory-completeness test (geoms/stats/themes/
   schemes) caught some classes of drift, and only because the root copy
   happened to live next to the tests.

## Decision

- New published package `@ggsvelte/skill` (`packages/skill/`) is the **one**
  home of the skill. The package root IS the skill directory: `SKILL.md` and
  `references/` at package root, `files: ["SKILL.md", "references"]`. Consumers
  get a stable, versioned path (`node_modules/@ggsvelte/skill/SKILL.md`) and
  can copy/symlink the package dir into their agent's skills directory as
  `ggsvelte/` (skill loaders key off frontmatter `name`, not directory name).
- `@ggsvelte/skill` joins the changesets **fixed** group: all five packages
  share one version. One version number means "spec + core + svelte + cli +
  skill as of the same release", and dependabot/npm-check-updates surfaces
  skill updates to consumers who bundle it.
- Clean break: `skills/` is removed from `@ggsvelte/svelte`'s `files` and both
  old copies are deleted (pre-1.0 breaking rides a minor per ADR 0013; same
  call 0022 made for the CLI bin). Two homes would recreate the drift this
  split removes.
- SKILL.md frontmatter carries **no version stamp**. package.json is the single
  version source; changesets bumps it automatically, and a frontmatter version
  would drift on every Version Packages PR.
- `scripts/changeset-check.ts` `isShippedPath` now matches root-level `files`
  entries (`SKILL.md`) exactly, not only directory prefixes — skill edits are
  shipped surface, so the changeset bot treats them like any other published
  change.
- Lock-step enforcement stays test-driven: `scripts/skill-content.test.ts`
  (inventory completeness + fence validation, repointed at `packages/skill/`)
  fails any spec change that doesn't update the skill in the same PR;
  `scripts/skill-package.test.ts` guards pack shape, lock-step version, and
  OIDC publish config.

## Release mechanics

Same constraint as 0022 (npm/cli#8544): trusted publishing cannot first-publish
a package. The maintainer hand-publishes `@ggsvelte/skill@0.26.2` once from the
PR branch before merge (`npm publish --access public --no-provenance`
— the provenance opt-out must be a CLI flag: npm applies `publishConfig`
over env vars and only filters keys explicitly set as CLI flags, so
`NPM_CONFIG_PROVENANCE=false` loses to `publishConfig.provenance: true`
(npm 11 EUSAGE "provider: null" outside CI)), configures the trusted publisher on npmjs.com (repo
`ljodea/ggsvelte`, workflow `release.yml`), and only then merges. On the merge
commit `publish-unpublished.ts` sees 0.26.2 on npm and no-ops; the next Version
Packages PR bumps all five packages to 0.27.0 and OIDC publishes them together
with provenance.
