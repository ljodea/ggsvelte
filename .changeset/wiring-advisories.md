---
"@ggsvelte/svelte": patch
---

# Advise on silently-inert interaction wiring

Two new advisory diagnostics (ADR 0013 ambiguity audit): `interactionScope`
without an `interaction` controller is ignored and now says so, and an
interaction handler (`oninspect`/`onselect`/`onzoom`/`onlegendfocus`/
`onlegendfilter`) whose capability prop is not enabled never fires and now
says so. Both are delivered once per prop per plot instance through the
existing `ondiagnostic` channel (dev-only console fallback) and never change
behavior. The passive controller-consumer pattern stays advisory-free.

Migration: none — additive
