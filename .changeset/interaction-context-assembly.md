---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor: one interaction context + controller assembly behind the plot engine

Internal only — no public API or behavior change. The five interaction
controller factories (zoom, selection, interval, surface, inspection) used to
declare their own 6–19-field dep bags, hand-wired by the plot engine across
~60 fields with `let surfaceState!` / `let semanticCandidateProjection!` late
bindings to break the surface ↔ inspection ↔ interval ↔ selection cycles.

A shared `InteractionContext` now carries the common bag (model, config
slices, handlers, announce, DOM refs, semantic-key service), each factory
takes `(context, options)` with options holding only controller-specific
ports, and a single `createInteractionStates` assembly owns the construction
order and sibling wiring internally. The surface→inspection reducer edge is a
hoisted concrete instance, so the `surfaceState!` late binding is gone; the
projection remains the one documented late binding.
