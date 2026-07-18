# 0013 — Post-0.1 migration policy: upgrade checks, migrations, codemods

- **Status:** accepted
- **Date:** 2026-07-18
- **Scope:** issue #7 — versioned migration policy, deprecated-surface and
  ambiguous-capability checks, codemod evaluation, migration docs wiring.
- **Artifacts:** `/guide/upgrading` (rolling upgrade page, `UPGRADING_MD` in
  `scripts/gen-llms.ts`), `packages/svelte/tests/migrations/` (type-checked
  fixtures), `scripts/migration-fixtures.test.ts`,
  `scripts/deprecation-wiring.test.ts`.

## Context

Before 0.1, interaction API changes could delete surfaces outright (the
pre-0.1 rename is a one-shot manual guide, `/guide/migrating-pre-0-1`, with
"no runtime compatibility shim"). 0.1.x is published on npm; upgrades are now
real events that need deliberate support. 0.1 → 0.2 itself is **additive** —
every 0.1 prop, callback, and export survives; the controller API
(`createPlotInteraction`) arrives alongside, not instead of, chart-local
props — so this record establishes the policy and the smallest set of live
artifacts, and defers machinery that has no real case yet to trigger-bound
follow-up issues rather than shipping it dormant.

## Versioning and support windows

- Pre-1.0, breaking changes ride **minor** releases. The linked changeset
  group (`spec`/`core`/`svelte`) versions together.
- `stable-intent` surfaces (per `lifecycle.json`) get a deprecation window of
  at least **one full minor release**: deprecated in 0.N means removable in
  0.N+2 at the earliest. "Deprecated in 0.2, removed in 0.3" does NOT satisfy
  the window.
- `superseded` surfaces survive until a **major** release (restates the
  stronger rule in CONTRIBUTING.md "Deprecation policy").
- `experimental` surfaces may change in any minor with a migration note only.
- Migration guidance is maintained for **adjacent-minor** transitions; older
  starting points chain through the per-transition sections of
  `/guide/upgrading` (rolling page, one stable anchor per transition; an
  outsized transition may get its own page, linked from its section, as the
  pre-0.1 page already is).

## Per-migration requirements (same PR as the change)

Every PR that deprecates, reshapes, or removes a published surface ships:

1. A changeset whose body carries an explicit `Migration:` marker — an
   absolute `/guide/upgrading` anchor URL, or the literal
   `Migration: none — additive`. Enforced for every minor/major changeset by
   `scripts/deprecation-wiring.test.ts` (markers, not prose sniffing, so
   additive minors must say so and non-additive ones cannot forget the link).
2. An upgrading-guide section with **before/after real Svelte source**. Guide
   code blocks are verbatim embeds of fixtures under
   `packages/svelte/tests/migrations/` (modulo the public import specifier),
   which svelte-check type-checks — enforced by
   `scripts/migration-fixtures.test.ts`. Examples cannot drift from the
   compiler's idea of the API.
3. `@deprecated` JSDoc carrying `since <version>` and an absolute guide URL
   whose page and anchor resolve (enforced by the wiring test; anchors are
   computed by the docs renderer itself, never a re-derived slug algorithm).
4. If the deprecation is **runtime-observable** (a prop or option, not a
   type): a runtime deprecation diagnostic (requirements below).
5. If the migration meets the codemod bar (below): a codemod with fixtures.
   Otherwise the guide section documents the manual change explicitly.

**Invariant: checks never rewrite code.** Checks are diagnostics or CI
assertions only. Future codemods are separate, opt-in commands: dry-run/diff
by default, writes only behind an explicit `--write`.

## Runtime deprecation checks — requirements (deferred until triggered)

There is nothing runtime-deprecated today (the three pre-0.1 aliases are
type-only), so no runtime machinery ships now; a permanently empty frozen
catalog would be dead code. The **first PR that deprecates a
runtime-observable surface** must implement, in the same PR:

- Advisory-severity diagnostics carrying `since` and removal-target metadata,
  plus the existing `{ message, prop, suggestions, docUrl }` shape.
- Delivery through the existing channel (`ondiagnostic`, else dev-only
  `console.warn`), fired **once per prop per plot instance** — no spam across
  reactive updates; silent in production builds.
- Never a behavior change: deprecated inputs keep working through the window.
- The concrete type design is decided then, not here: extending the closed
  `InteractionDiagnosticCode` union vs a broader plot-level diagnostic union
  vs separate delivery — deprecated props may not be interaction-scoped, so
  prescribing the interaction catalog now would prejudge the wrong home.

Tracked by a standing issue (see References).

## Codemods — evaluation outcome (deferred until triggered)

Zero mechanical post-0.1 migrations exist, so no runner ships now. Whether a
future migration **requires** a codemod is decided by these factors — not a
numeric prop-count threshold:

- **Syntactic detectability** — can every rewrite site be found from parse
  trees alone?
- **Semantic confidence** — is the rewrite meaning-preserving without human
  judgment? (The pre-0.1 `onzoom` payload narrowing is the canonical
  counter-example: judgment required, codemod prohibited, manual guide
  section instead.)
- **Expected prevalence** in real consumer code.
- **Blast radius** of a wrong rewrite.
- **Precise identifiability of skipped cases** — anything the tool does not
  rewrite must be reported with the guide anchor for the manual change,
  never silently half-migrated.

Acceptance criteria for any codemod, enforced by its fixtures
(`fixtures/migrations/<from>-<to>/<case>/{input,expected}.svelte`): idempotent
(second run is a no-op), formatting untouched outside edited ranges,
unrecognized shapes left untouched with a printed manual-change pointer.
Starting-point stack (revisit against the first real transformation):
`svelte/compiler` `parse()` + `magic-string` for `.svelte` positional edits
(jscodeshift/ts-morph cannot parse Svelte templates); a script-AST tool may
be added for pure-TS spec files if the transform demands it.

## Acceptance-criteria applicability (issue #7, honest status)

| Criterion                                             | Status                        | Mechanism                                                                       |
| ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Real-Svelte fixture per supported migration           | Met                           | `packages/svelte/tests/migrations/` + sync test; fixtures in svelte-check scope |
| Checks never rewrite code silently                    | Met                           | Diagnostics/CI-assertions only; dry-run-default rule above                      |
| Codemods idempotent / format-preserving               | N/A — zero codemod candidates | ACs recorded above; enforced by the first codemod's fixtures                    |
| Unsupported transformations explain the manual change | N/A post-0.1 — none exist     | Required guide subsection per future migration                                  |
| Release notes link migration guidance                 | Met for 0.2                   | `Migration:` markers in all pending minors; wiring test                         |

## Ambiguity audit — verdicts

Audited against `resolveInteractionScope` (`assembly/assemble.ts`),
`normalizeInteractionConfig` (`interaction/interaction.ts`), the orchestrator
wiring (`plot-orchestrator.svelte.ts`), and `legend/filter-state.svelte.ts`.
Capabilities are strictly opt-in (`undefined`/`false` ⇒ off; `legendFilter`
defaults to `false` in `GGPlot`).

| Combination                                                                                             | Behavior                                            | Verdict                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interaction` without `interactionScope`                                                                | `TypeError` at render                               | Loud by design — no diagnostic                                                                                                                                                                       |
| Controlled zoom without `interactionScope.x`/`.y`                                                       | `TypeError` at render                               | Loud by design — no diagnostic                                                                                                                                                                       |
| `interactionScope` without `interaction`                                                                | Prop silently ignored; scope derived from `key`/aes | **`INTERACTION_SCOPE_WITHOUT_CONTROLLER` (advisory)**                                                                                                                                                |
| Handler prop with its capability off (`oninspect`/`onselect`/`onzoom`/`onlegendfocus`/`onlegendfilter`) | Handler never fires, silently                       | **`INTERACTION_HANDLER_WITHOUT_CAPABILITY` (advisory)**, `prop` = handler, `actual` = capability to enable; keyed on capability _requested_, so requires-key/faceted degradations never advise twice |
| Controller state + locally disabled capability                                                          | Documented passive-consumer linked-view pattern     | Intentional — no diagnostic                                                                                                                                                                          |
| `oninteraction` with no capability and no controller                                                    | Unified stream is empty                             | Covered by the per-handler advisories above; no separate code                                                                                                                                        |
| `ontoolchange` with no tools available                                                                  | No tool events                                      | Follows from capability opt-in; tool rail shows unavailability — no code                                                                                                                             |
| `tool` naming an unavailable capability                                                                 | Tool not activated                                  | Already `INTERACTION_TOOL_UNAVAILABLE`                                                                                                                                                               |
| `select` point / non-independent interval preset without `key`                                          | Selection not durable / combines nothing            | Already `INTERACTION_POINT_REQUIRES_KEY` / `INTERACTION_INTERVAL_PRESET_REQUIRES_KEY`                                                                                                                |
| `legendFocus` without `key` / without discrete legends                                                  | Degraded                                            | Already `INTERACTION_LEGEND_REQUIRES_KEY` / `INTERACTION_LEGEND_DISCRETE_ONLY`                                                                                                                       |
| `zoom` on faceted plots                                                                                 | Disabled                                            | Already `INTERACTION_INTERVAL_FACET_UNSUPPORTED`                                                                                                                                                     |

The two new advisories are delivered through the ordinary diagnostic channel
once per prop per plot instance (`wiringDiagnostics` in the orchestrator),
and are component-tested in
`packages/svelte/tests/interaction/wiring-diagnostics.test.ts`.

## Ambiguity-audit candidates (superseded by the verdicts above)

Checks for ambiguous capability combinations are added only where an audit
confirms silently surprising behavior — diagnostics are conditional output,
not presumed deliverables. Candidates and pre-seeded evidence:

- Controller state while local props leave the capability disabled:
  **intentional** passive-consumer pattern
  (`packages/svelte/tests/fixtures/PassiveControllerConsumerPlot.svelte`) —
  expected verdict: no diagnostic.
- `interactionScope` provided without an `interaction` controller: silently
  ignored — advisory candidate.
- Handler prop present while its capability is off (`onselect` without
  `select`, `onzoom` without `zoom`, `onlegendfocus`/`onlegendfilter`
  likewise): advisory candidate; verify intentional reusable-handler and
  spread patterns first.
- `tool` naming an unavailable capability: already covered by
  `INTERACTION_TOOL_UNAVAILABLE` — no new code.

The audit's full combo × behavior × verdict table is appended to this record
when it lands, so combos judged fine are recorded rather than silently
skipped.

## References

- Issue #7 (scope + acceptance criteria for this record).
- Follow-up issues (filed with this record): #289 runtime deprecation
  diagnostics (triggered by the first runtime-observable deprecation);
  #290 codemod runner + fixture harness (triggered by the first migration
  meeting the bar).
- CONTRIBUTING.md "Deprecation policy"; `lifecycle.json` lifecycle tags;
  ADR 0011/0012 for the interaction and release-automation background.
