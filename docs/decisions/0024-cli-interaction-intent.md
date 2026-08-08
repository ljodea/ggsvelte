# 0024 — CLI host interaction intent (`--inspect`)

Date: 2026-08-08. Status: accepted. Closes the agent-loop half of #1531.

## Problem

Interaction diagnostics (`INTERACTION_DIAGNOSTIC_CATALOG`, composition,
deprecation) fire through Svelte `ondiagnostic` at plot bind/render time. The
agent feedback loop the CLI was built for (`ggsvelte-render` → stderr JSONL →
fix → re-render) never saw them.

An agent that follows the skill's "use the CLI" path can ship a schema-valid
chart with a disastrous inspect mode and get **zero** interaction diagnostics.
Expanding advisories only helps hosts that already listen on `ondiagnostic`.

Inspect mode is intentionally **not** a PortableSpec field (host capability).
Putting it on the wire would couple headless SVG render to browser interaction
chrome.

## Decision

1. **Document the contract.** The CLI covers PortableSpec validation, pipeline
   warnings/advisories, scale diagnostics, and `lintSpec`. Host interaction
   quality is **opt-in** via a declared host intent flag — not automatic on
   every render.
2. **Delivery path: host interaction intent on the CLI.**
   `ggsvelte-render --inspect <mode>` where `mode` is
   `auto|exact|x|y|xy`. The flag does not change SVG output. It runs the same
   pure collectors the host uses (`inspectAxisOnBarColDiagnostics` /
   `collectInspectIntentDiagnostics`) and writes matching codes to stderr with
   `source: "interaction"`.
3. **Single implementation.** Pure collectors and their catalog messages live
   in `@ggsvelte/core`. The Svelte host re-exports them and spreads
   `INSPECT_GEOM_DIAGNOSTIC_CATALOG` into `INTERACTION_DIAGNOSTIC_CATALOG`. No
   prose-only fork of the rules.
4. **Default remains silent.** Without `--inspect`, the CLI does not invent
   host intent. Headless SVG-only charts stay free of false interaction
   advisories.

## Non-goals (unchanged from #1531)

- Moving Inspect mode into PortableSpec.
- Full browser visual regression for every tooltip string.
- Emitting every runtime interaction diagnostic (keys, lineage, wiring) from
  the CLI — those still need a live host. This decision covers the
  **inspect×geom pure path** that agents can declare intent for.

## Deferred (still useful, separate work)

- Spec-lint hygiene for portable `inspect: false` on decorative layers when
  siblings stay inspectable.
- Docs/gallery CI that mounts examples with inspect on and asserts no
  interaction advisories of severity advisory+.
- CLI emission of high-cardinality discrete advisories (needs trained ordinal
  domain sizes from the pipeline; collectors already exist).

## Acceptance evidence

- ADR (this file).
- `ggsvelte-render --inspect xy` on a col-layer spec emits
  `INTERACTION_INSPECT_X_ON_COL` on stderr with `source: "interaction"`.
- Skill + CLI README state what the CLI covers and does not cover for
  interaction.
