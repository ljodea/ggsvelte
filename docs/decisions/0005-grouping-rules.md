# 0005 — Group derivation rules (M0a-5 spike)

- **Status:** accepted (spike exit); prototype and fixtures are the executable spec
- **Date:** 2026-07-10
- **Artifacts:** `spikes/pure/src/grouping.ts` (prototype `deriveGroups()`), `spikes/pure/tests/grouping.test.ts`, `spikes/pure/fixtures/grouping/` (generator `generate.R` + 11 JSON fixtures + `data.json`)
- **Verified against:** ggplot2 **4.0.3** on R **4.6.1** via the public `layer_data()` / `ggplot_build()` API

## Context

The plan (Semantics: "Grouping is a spike with executable fixtures, not a design doc") requires
group derivation to happen after data binding and scale-type inference, per facet panel, before
stats and positions, with effective group = interaction of discrete aesthetics, overridable via
`aes.group`. This record locks the precise rules and their ggplot2 parity evidence.

## The rules (precise spec)

Given a bound `ColumnTable`, a resolved aes mapping (channel → `{field}` or `{value}`), and
per-field discreteness (declared or inferred), `deriveGroups` returns one group id per row:

1. **Explicit `aes.group` wins outright.**
   - `group: {field: f}` → group by the values of column `f`, **regardless of that column's
     discreteness** (a numeric group column still groups; this matches ggplot2, which runs
     `id()` on whatever the group column holds).
   - `group: {value: v}` (constant, e.g. ggplot2's `aes(group = 1)`) → a single group.
   - When `group` is mapped, no other aesthetic participates in grouping.
2. **Otherwise: interaction of all discrete mapped aesthetics.** Every channel in the mapping
   participates if (and only if) its column is discrete — positional (`x`, `y`) and
   non-positional (`color`, `fill`, `shape`, `linetype`, …) alike. Excluded channels: `group`
   (rule 1) and `label` (ggplot2 masks `label` and `PANEL` out of the interaction). The group
   key is the tuple of the row's values across the participating columns.
3. **Continuous channels never group.** A numeric column on `color` (or anywhere else) creates
   a continuous scale and contributes nothing to grouping.
4. **No discrete aesthetic → one implicit group.** ggplot2 represents this as the sentinel
   `NO_GROUP = -1`; we return all rows in group `0` with `source: "none"` (the sentinel's only
   downstream meaning — "treat everything as one group" — is preserved; the provenance is kept
   in the `source` field instead of a magic id).
5. **Constant discrete aes values** (e.g. `aes(color = "red")`-style `{value: "red"}` on a
   non-group channel): in ggplot2 a string constant becomes a one-valued discrete column, which
   flips the result from NO_GROUP to a single _real_ group but can never split rows. Mirrored:
   constants join the interaction key; result is `source: "derived"` with one group.
6. **Canonical ids.** Group ids are renumbered by **first occurrence in row order**, 0-based.
   This is the comparison-stable form used by fixtures and everything downstream. (ggplot2's raw
   ids follow factor-level — i.e. alphabetical for characters — order of the interaction; the raw
   ids are recorded in each fixture as `rawGgplotGroups` for audit, the canonical form as
   `canonicalGroups`.)
7. **Nulls** form their own group level (a distinct interaction value), they do not propagate
   or drop rows at this stage. _(TS-only decision; see open questions.)_

Timing (locked by the plan, not re-derived here): grouping runs per facet panel, after data
binding and scale-type inference, **before** stats and positions. Group derivation is
geom/stat-independent — the fixtures exploit this by observing groups through an identity-stat
point layer.

## Discreteness rules assumed

Mirrors ggplot2's `is.discrete()` (`factor || character || logical`):

| JS column type | Discreteness                                                            |
| -------------- | ----------------------------------------------------------------------- |
| `string`       | discrete                                                                |
| `boolean`      | discrete                                                                |
| `number`       | continuous, unless declared discrete                                    |
| `Date`         | continuous, unless declared discrete (R's `Date` is a continuous scale) |
| `null`         | carries no type information; ignored by inference                       |
| mixed          | discrete if any non-null value is string/boolean, else continuous       |

`declaredDiscreteness` (field → `'discrete' | 'continuous'`) always overrides inference; this is
the hook the real pipeline's scale-type inference / `DataProfile` (`quantitative`/`temporal` →
continuous; `ordinal`/`nominal` → discrete) will feed.

## Fixture provenance

All 11 fixtures are **R-generated** (ggplot2 4.0.3, R 4.6.1) by
`Rscript spikes/pure/fixtures/grouping/generate.R` — none needed hand derivation. Dataset:
12 rows; `cat1` ∈ {b,a,c} (first-occurrence order deliberately non-alphabetical), `cat2` ∈ {y,x},
`num1`, `num2` numeric, `date1` weekly dates.

| Fixture                        | Checks                          | Result                                                                        |
| ------------------------------ | ------------------------------- | ----------------------------------------------------------------------------- |
| 01 no-discrete-single-group    | `aes(x=num1, y=num2)`           | NO_GROUP (-1) → 1 group                                                       |
| 02 discrete-x-groups           | `aes(x=cat1, y=num1)`           | 3 groups by cat1                                                              |
| 03 discrete-color-groups       | `aes(color=cat1)`               | 3 groups                                                                      |
| 04 interaction-of-discrete     | `color=cat1, linetype=cat2`     | 6 groups (cat1×cat2)                                                          |
| 05 explicit-group-override     | `aes(x=cat1, group=cat2)`       | 2 groups; discrete x ignored                                                  |
| 06 constant-group              | `aes(group=1)`                  | 1 group                                                                       |
| 07 line-splits-by-group        | `geom_line`, `color=cat1`       | line count == group count (3)                                                 |
| 08 bar-stack                   | `geom_bar`, `x=cat1, fill=cat2` | 6 pre-stat groups; 2 stacked segments per x (built bars + ymin/ymax recorded) |
| 09 bar-dodge                   | same + `position_dodge`         | identical groups; 2 dodge slots per x (xmin/xmax recorded)                    |
| 10 continuous-color-no-groups  | `color=num2`                    | no grouping                                                                   |
| 11 date-x-continuous-no-groups | `x=date1`                       | no grouping (documents the Date rule)                                         |

A handful of behaviors are covered by **hand-derived TS unit tests only** (documented ggplot2
semantics, no R fixture): `label` exclusion from the interaction, numeric explicit-group fields,
boolean discreteness, null-as-own-level, declared-discreteness overrides, zero-row tables.

`bun test` in `spikes/pure` runs 27 grouping tests green (65 with the co-located M0a-2 spikes).

## Divergences vs ggplot2 and resolutions

1. **Group id numbering.** ggplot2 numbers groups by factor-level (alphabetical) order of the
   interaction, e.g. raw ids `[4,1,6,3,2,5,…]` for our row order. We renumber by first
   occurrence on **both** sides before comparing — the partition (which rows share a group) is
   what is contractual, not the ids. Deliberate divergence, resolved by canonicalization.
2. **`NO_GROUP = -1` sentinel.** Replaced by `groups = all 0` + `source: "none"`. No magic
   sentinel leaks into the pipeline; downstream semantics identical.
3. **Factor machinery.** ggplot2's grouping rides on factors; our ColumnTable has none. For
   grouping this only affects id _ordering_ (see 1). Level ordering matters again for scales and
   legends — out of scope here, flagged for M1.

No behavioral divergence was found in which rows group together: all 11 R-generated cases match
`deriveGroups` exactly.

## Surprising ggplot2 behaviors recorded

- **Stacking/dodging do not have their own grouping rule.** With `x=cat1, fill=cat2` the
  pre-stat group is the full 6-way cat1×cat2 interaction (not "2 fill groups"); `stat_count`
  then yields one bar segment per group, and stack/dodge arrange the segments that share an x.
  "Stack groups per x" is a _consequence_ (distinct groups within each x partition), not an
  input.
- **`layer_data()` under `position_dodge` returns non-integer x** (category center ± offset,
  e.g. 0.775/1.225); the category index must be recovered by rounding. Bit the generator once.
- A discrete x in built data is integer level codes (`mapped_discrete`), not the labels.

## Open questions for M1

1. **Ordered factors / explicit level order.** With no factor type, first-occurrence order is
   the only intrinsic order. When a scale declares an explicit `domain` (level order), should
   group ids re-canonicalize to it, and does anything downstream (stack order, legend order,
   palette assignment) key off group id order? Likely: keep group ids first-occurrence-stable
   and give _positions/scales_ the level order — needs fixtures (ggplot2 stacks in reverse level
   order by default).
2. **Null/NA parity.** We made null its own group level without an R fixture; verify against
   ggplot2 (`id()`/vctrs keep NA as a level, and `NA` in discrete scales has its own handling)
   and against the plan's missing-value policy per stat.
3. **Faceting interaction.** Fixtures are single-panel. Per-panel derivation is locked by the
   plan; add a faceted fixture confirming groups are panel-local while id canonicalization stays
   deterministic.
4. **Staged mappings.** `after_stat()`/`after_scale()` channels must not affect grouping
   (grouping is pre-stat by construction); make `normalize()` enforce that staged channel forms
   are excluded from the interaction.
5. **Multi-field explicit group.** ggplot2 users write `group = interaction(a, b)`; the spec's
   `group` channel form may want to accept an array of fields as sugar.
6. **Channel exclusion list.** We exclude `group` and `label` (ggplot2 masks `label`/`PANEL`).
   Audit the final channel roster (e.g. `tooltip`-like agent-facing channels) for which are
   non-grouping.
