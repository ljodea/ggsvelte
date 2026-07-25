---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(#659): ship the plot-props codemod (slice 7, closes #290)

Add `ggsvelte-codemod`, the first codemod under ADR 0013's policy: it migrates
the seven grammar props deprecated in 0.11.0 — `facet`, `coord`, `scales`,
`guides`, `legend`, `theme`, `labs` — into the child layers that replace them.

```bash
npx ggsvelte-codemod src          # diff only, writes nothing
npx ggsvelte-codemod --write src  # apply
```

Dry-run by default, writes only behind `--write`, per ADR 0013's rule that
checks and codemods never rewrite code implicitly. Migrated children are
inserted before any child the file already had, so a hand-written
`<ScaleColorDiscrete/>` keeps winning over a migrated `scales` prop (D2:
props apply first, then children in registration order).

Scoped to meaning-preserving rewrites, never style. It targets the generic
escape hatches (`<Coord value={…}/>`, `<Scale value={…}/>`, `<Guides
value={…}/>`) rather than named shells, because for scales the named form is
not byte-identity-preserving (D8 — `normalize()` does not infer scale `type`).
Flat bags expand to named props (`labs={{ title: "Sales" }}` →
`<Labs title="Sales"/>`), falling back to `<Labs {...expr}/>` when an object
literal cannot be expanded losslessly. `theme={expr}` with a non-literal value
is deliberately NOT rewritten — `theme` is `ThemeName | ThemeSpec` and
`<Theme>` has no `value` hatch — and is reported as `manual change required`
with the guide anchor instead of being half-migrated.

Only files importing `GGPlot` from `@ggsvelte/svelte` are touched, so a
consumer's own `GGPlot` is never rewritten.

Fixtures live at `packages/svelte/tests/codemod/fixtures/<from>-<to>/<case>/`
per ADR 0013 and assert the acceptance criteria directly: idempotence, edits
confined to the rewritten ranges, and unrecognized shapes left untouched with
a printed pointer.

Migration: <https://ggsvelte.sh/guide/upgrading#migrate-the-grammar-props-with-the-codemod>
