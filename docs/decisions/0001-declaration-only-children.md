# 0001 — Declaration-only children as the Svelte component sugar (spike M0a-1)

Status: **decided** · Verdict: **SHIP with constraints** (mechanism A now; mechanism B proven as upgrade path)
Spike code: `spikes/browser/src` + `spikes/browser/tests/{browser,ssr}` (throwaway)
Environment: svelte 5.56.4, vitest 3.2.7 browser mode (Playwright chromium, headless), vitest node project for SSR

## Context

The product API is props-first (`<GGPlot spec/layers>`). This spike decides whether
declaration-only children — `<GGPlot><GeomPoint alpha={0.6}/></GGPlot>` where children
emit no markup and only register layer fragments into a context registry — can ship as
ergonomic sugar. The plan's hostile exit criteria: SSR/hydration ordering, `{#if}`
re-register, keyed `{#each}` reorder, two plots per page, unmount cleanup, reactive prop
updates — all with no `untrack()` hacks and no deferred-first-paint fallback.

## What was built

- `src/lib/geoms/registry.svelte.ts` — `LayerRegistry` provided via `setContext` by `<GGPlot>`;
  geoms call `registerLayer()` **during component init** (never in `$effect`/`$effect.pre`)
  and unregister in `onDestroy`. Registered descriptors are **live objects whose properties
  are getters over the child's `$props`**, so prop changes flow into the parent's reactive
  reads with zero re-registration and zero effects.
- `src/GGPlot.svelte` — renders `{@render children?.()}` FIRST, then a `<ul>` scene from a
  `$derived` over the registry (mirrors the product's spec-assembly-as-`$derived` design).
- `src/GeomPoint.svelte`, `src/GeomLine.svelte` — mechanism A children: **zero markup**.
  Inert (no-op) without a `<GGPlot>` ancestor.
- `src/ordered/GGPlotOrdered.svelte`, `src/ordered/GeomPointMarked.svelte` — mechanism B:
  each child emits ONE hidden inert element (`<gg-marker style="display:none">`); the plot
  sorts registry entries by marker DOM order inside the scene `$derived`, and a
  MutationObserver on a `display:contents` host bumps a version signal so pure keyed moves
  (which change nothing reactive) trigger a re-sort.
- `src/GGPlotSceneFirst.svelte` — deliberate hazard demo (scene markup ABOVE the children
  render tag).
- 28 hostile tests: `tests/ssr/ssr.test.ts` (7), `tests/browser/children.test.ts` (12),
  `tests/browser/ordered.test.ts` (8), `tests/browser/hydration.test.ts` (1).

## The mechanism that works (mechanism A — strict declaration-only)

1. **Init-time registration, template order.** Svelte 5 instantiates children synchronously,
   in template order, while the parent's fragment is being created. Because
   `{@render children?.()}` precedes the scene markup, every child has registered before the
   scene's `{#each}`/`$derived` is first evaluated. `$derived` laziness plus template order —
   **no version counter, no deferral, no `untrack()`, no `$effect` anywhere** — gives correct
   synchronous first paint in both CSR and SSR.
2. **Live getter descriptors.** `registry.register({ geom: 'point', get alpha() { return alpha } })`
   makes reactive prop updates flow through the parent's `$derived` without touching registry
   membership (verified: `registerCount` unchanged, entry ids unchanged, text updates in place).
3. **`onDestroy` unregistration** for `{#if}`/`{#each}` removal and whole-plot teardown.
4. **Registry storage must be commutative, not read-modify-write** (see finding 3 below):
   a plain non-reactive insertion-ordered `Map` as the authoritative store + a monotonic
   version `$state` (distinct value per mutation) as the reactivity trigger.

## Findings (all empirically verified on svelte 5.56.4)

1. **The feared first-mount ordering hazard does not exist in the correct template order**,
   and is mild even in the wrong one. With scene markup ABOVE `{@render children}` the scene
   is permanently empty **in SSR** (one pass, registry read before registrations). In CSR,
   however, `mount()` flushes the registration-triggered update before returning, so even the
   hazardous arrangement paints correctly synchronously. Template order (children first) is
   load-bearing for SSR only — an authoring rule, not a runtime mechanism.
2. **Declaration order is observable only at init time.** A markup-free child gets NO signal
   when a keyed `{#each}` moves it (no init, no prop change, no destroy). Measured
   consequences for mechanism A:
   - keyed reorder: registry order unchanged (stale z-order);
   - keyed mid-list insertion: new layer registers at the END;
   - `{#if}` re-mount: layer returns at the END, not its declaration position
     (membership and dedup are perfect; only position drifts);
   - **unkeyed `{#each}` reorder works perfectly** (index-based reconciliation turns reorder
     into in-place prop updates that flow through the live getters — zero re-registrations).
3. **CRITICAL for M0c — Svelte 5 batching lost-update hazard.** A registry implemented as
   `#entries = $state.raw([])` with spread-append on register and `.filter()` on unregister
   SILENTLY LOST an entry when a keyed `{#each}` destroyed one child and created another in
   the same flush: the `onDestroy`-side read observed a stale array (uncommitted batch-local
   write from the init side) and its write clobbered the fresh registration. Trace:
   `register(x)` then `unregister(b)` executed, yet the final array lacked `x`. Any
   cross-component read-modify-write of shared reactive state spanning init/teardown in one
   flush is unsafe. The Map+version pattern fixes it and passed a 10-cycle rapid-toggle
   stress test plus keyed add/remove/insert.
4. **SSR works outright.** `svelte/server` `render()` executes children before the scene in
   one pass: all layers present, declaration order, layer count correct, `{#if}`-hidden
   children never register, two plots isolated, children contribute only comment anchors.
5. **Hydration works** (best-effort real test): SSR HTML captured from the node project and
   hydrated in chromium with `hydrate()`. The SSR `<li>` nodes are adopted by identity (not
   recreated), no hydration-mismatch warnings, and the plot stays interactive (toggle works
   post-hydration). Registration happens during hydration's init phase exactly as in CSR.
6. **Mechanism B closes the ordering gap at the cost of one hidden element per child.**
   Marker-DOM-order sort + MutationObserver-driven version bump passed ALL order fidelity
   tests: pure keyed reorder, mid-list insertion, `{#if}` re-mount position, stress, SSR.
   No `untrack()`, correct synchronous first paint; pure moves settle one microtask after
   the flush.
7. Cross-cutting: two plots never cross-talk (context-scoped registries); unmount leaves an
   empty registry; a geom outside `<GGPlot>` is inert and throws nothing.

## Test results vs exit criteria

| Exit criterion                                           | Mechanism A (zero markup) | Mechanism B (hidden marker)                    |
| -------------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| SSR ordering (order, `{#if}`, two plots)                 | PASS                      | PASS                                           |
| Hydration (adopt-not-recreate, no mismatch, interactive) | PASS                      | not separately tested (same registration path) |
| Initial CSR order, synchronous first paint               | PASS                      | PASS                                           |
| Reactive prop update w/o re-registration                 | PASS                      | PASS                                           |
| `{#if}` re-register: membership + no duplicates          | PASS                      | PASS                                           |
| `{#if}` re-register: returns to declaration POSITION     | FAIL (appends at end)     | PASS                                           |
| Keyed `{#each}` reorder follows declaration order        | FAIL (move is invisible)  | PASS                                           |
| Unkeyed `{#each}` reorder                                | PASS                      | not tested (subsumed)                          |
| Two plots, no cross-talk                                 | PASS                      | PASS                                           |
| Unmount cleanup                                          | PASS                      | PASS                                           |
| Rapid toggle stress                                      | PASS                      | PASS                                           |
| No `untrack()`, no deferred first paint                  | PASS                      | PASS                                           |
| HMR identity                                             | NOT TESTED (residual)     | NOT TESTED (residual)                          |

## Verdict

**SHIP with constraints.** Components ship as sugar in M1 using **mechanism A** (strictly
markup-free), with these documented constraints:

- Layer z-order equals registration order. Static markup, `{#if}` membership, unkeyed
  `{#each}`, and all reactive prop updates have full declaration-order fidelity. Dynamic
  keyed `{#each}` reorder / mid-list insertion / `{#if}` re-mount do not restore declaration
  position — the docs must steer dynamic layer composition to the props-first API
  (`layers={[...]}`), which is the guaranteed product surface anyway.
- If full keyed-reorder fidelity ever becomes a requirement, mechanism B is proven and
  drop-in (one hidden inert marker element per geom child + DOM-order sort + MutationObserver
  version bump); the registry API already carries the optional `marker` hook.
- An explicit `order`/`z` prop on geom components is a third, simpler escape hatch M1 can add
  without new mechanism.

The product does not depend on components (props-first inversion), so these constraints are
acceptable for sugar.

## Residual risks

1. **Hydration in a real SvelteKit app is untested.** The hydrate test inlines SSR HTML
   captured at svelte 5.56.4; hydration comment-marker format is version-coupled. Re-verify
   in M1 with an actual SvelteKit SSR round-trip.
2. **HMR identity** (in the plan's criteria list) was not exercised — vitest cannot simulate
   Vite HMR. Risk: HMR re-instantiation could duplicate registrations; the Map+version
   registry dedups by id so worst case is a re-registered (end-positioned) layer. Test
   manually in the M1 docs app.
3. **Svelte batching semantics are internals-adjacent.** The lost-update behavior (finding 3)
   was measured, not documented by Svelte; future async-svelte changes could shift teardown
   timing again. The commutative-registry pattern is robust to reordering, but keep the
   rapid-toggle/keyed-churn tests in the adapter's permanent suite.
4. Mechanism B's MutationObserver corrects pure-move ordering one microtask after the flush
   (visual-only, z-order settle). Irrelevant unless B ships.
5. `state_referenced_locally` compile warnings fire for the init-time `onRegistryCreated`
   test hook (intentional one-shot call). Cosmetic; the real adapter won't expose that hook.

## What M0c must know

- **Registry pattern to reuse:** non-reactive insertion-ordered `Map` + monotonic version
  `$state` (never a reactive array with read-modify-write); init-time registration; live
  getter descriptors over `$props`; `onDestroy` unregistration. No effects needed anywhere
  in the registration path.
- **Template rule:** `{@render children?.()}` must precede all registry-consuming markup in
  `<GGPlot>` (SSR correctness depends on it; enforce with a comment + SSR test).
- **Never read-modify-write shared reactive state across component init/teardown boundaries**
  — this applies beyond the registry (e.g. scale-state stores, run-id bookkeeping).
- Spec equivalence (components → normalized PortableSpec) should treat layer order as
  registration order; the M0c equivalence tests only need the static/portable subset, where
  A's order is already exact.
- Tooling notes from this spike: the shared `spikes/browser` package was moved to
  vitest 3.2.7 (v3 string `provider: 'playwright'` config) by the concurrent M0a-3 work;
  on this machine (arm64 bun + x64 node under Rosetta) bun installs arm64-only native
  binaries — rolldown/rollup/esbuild darwin-x64 binaries had to be added manually. Pin CI
  to one architecture (the pinned Playwright container already does this).
