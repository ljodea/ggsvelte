# 0002 — Scale-state codec & discrete-scale stability semantics (spike M0a-2)

- **Status**: Accepted (spike passed; prototype in `spikes/pure/src/scale-state.ts`, 38 tests green under `bun test` in `spikes/pure/`)
- **Date**: 2026-07-10
- **Plan section**: "Scale stability (the flagship correctness fix)"

## Verdict

The plan's contract is implementable exactly as written, in ~250 lines of
dependency-free TypeScript, with one additive change to the state shape
(`exhaustWarned`) and one clarified semantic (grow-mode `domain` output lists
only _present_ values). No blockers for M0c/M1.

## 1. Canonical key codec (final format)

Discrete domain values are keyed by an encoded string:

| Input                              | Encoded key                                | Notes                                                        |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| string `s` (not starting with `@`) | `s` verbatim                               | zero-cost common case                                        |
| string starting with `@`           | `'@' + s`                                  | escape by doubling the sigil                                 |
| number `n` (finite, not `-0`)      | `@n:` + `String(n)`                        | `String`/`Number` round-trip exactly, incl. `1e21`, `5e-324` |
| `NaN`                              | `@n:NaN`                                   | stable key: NaN equals itself as a series                    |
| `-0`                               | `@n:-0`                                    | distinct from `@n:0` (`Object.is` semantics)                 |
| `±Infinity`                        | `@n:Infinity` / `@n:-Infinity`             | falls out of `String()`                                      |
| boolean                            | `@b:true` / `@b:false`                     |                                                              |
| bigint                             | `@i:` + decimal string                     | added during the spike; free to support                      |
| `Date`                             | `@d:` + epoch millis (`@d:NaN` if invalid) | dates key by instant, not identity                           |
| `null`                             | `@null`                                    |                                                              |
| `undefined`                        | `@undefined`                               |                                                              |
| object / array / symbol / function | **TypeError**                              | not a legal discrete domain value; fail loudly               |

Decode: keys not starting with `@` are raw strings; `@@…` strips one `@` and
returns a string; otherwise the 3-char tag (`@n:`, `@b:`, `@i:`, `@d:`) or the
literal `@null` / `@undefined` is interpreted; anything else throws
"Malformed encoded scale key" (corrupted persisted state fails loudly, and
`adoptScaleState` catches structural damage before keys are ever decoded).

Guarantees (all tested):

- Full round-trip, including `NaN`, `-0`, `±Infinity`, invalid `Date`.
- No cross-type collisions: `encodeKey('1') === '1'` ≠ `encodeKey(1) === '@n:1'`;
  `'true'` ≠ `true`; `'null'` ≠ `null`; `'NaN'` ≠ `NaN`; `Date(0)` ≠ `0` ≠ `'0'`.
- No user string can forge a tag: `'@n:1'` encodes to `'@@n:1'`.

## 2. ScaleState (final shape, schema version 1)

```ts
interface ScaleState {
  version: 1;
  fingerprint: string; // palette identity hash (hex)
  assignments: [string, number][]; // [encodedKey, rawIndex]
  nextIndex: number; // monotone; never reused
  exhaustWarned: boolean; // one-time exhaustion-warning latch
}
```

- Plain JSON; `JSON.parse(JSON.stringify(state))` is lossless (tested).
- `exhaustWarned` is an **addition to the planned shape**, discovered during the
  spike: "one-time warning" must survive re-renders _and_ persistence/SSR
  adoption, so the latch has to live in the serialized state, not in transient
  pipeline memory. (Tested: no second warning after serialize→adopt.)
- Raw indices in `assignments` may exceed the range length; **cycling is applied
  at lookup time** (`range[rawIndex % range.length]`). This keeps stored indices
  meaningful if the user later supplies a bigger range with the same fingerprint
  — which can't happen for value-hashed ranges (bigger range ⇒ new fingerprint)
  but keeps the invariant simple: indices are assignment order, period.
- Helpers: `serializeScaleState(state)` / `adoptScaleState(json)`. Adoption
  validates structure and throws on malformed input; **version mismatch does
  not throw** — `trainDiscrete` degrades it to a fresh state + `version-mismatch`
  warning, so an old persisted blob can never brick a chart.

## 3. Palette fingerprint

`fingerprint = fnv1a("t" + len(type) + ":" + type + "|" + palettePart)` where
`palettePart` is `"s" + len(scheme) + ":" + scheme` when a scheme _name_ is
present, else `"r"` + each resolved range value as a **length-prefixed encoded
key**. Consequences (all tested):

- Same color values in a freshly-allocated array → same fingerprint (no
  invalidation on re-render).
- Changed scheme name, changed scale type, or changed range values → new
  fingerprint → fresh assignments + `fingerprint-mismatch` dev notice.
- Scheme name wins over range values: a re-resolved scheme array (even with
  different values, e.g. a scheme version bump upstream) does not invalidate.
- Length prefixes prevent `['ab','c']` / `['a','bc']` smearing.
- **Hash is FNV-1a 32-bit, not SHA.** Crypto strength is not required: the
  fingerprint is a change detector, a collision only means a missed
  invalidation, and the input space (type + palette) is tiny. Zero-dependency
  and synchronous (WebCrypto SHA is async — would poison the pure pipeline).

## 4. Training semantics

`trainDiscrete(values, spec, prevState?) → { mode, state, domain, indexOf, rangeValueOf, warnings }`

| Case                           | Mode       | Behavior                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec.domain` set              | **pinned** | Mapping is positional in the explicit domain (deduplicated). Out-of-domain data → `undefined` from `rangeValueOf` ("unknown" output) + one deduplicated `out-of-domain` warning listing offenders. **Stored assignments are SUSPENDED, not discarded**: `result.state` is `prevState` verbatim (or a fresh empty state if none). Removing the domain later restores prior colors exactly (tested). |
| default (`domainMode: 'grow'`) | **grow**   | Resume from `prevState` iff `version` and `fingerprint` match (else fresh + warning). First-seen keeps its assignment; new values get `nextIndex++`; removed values are retained in state but excluded from the returned `domain`. Sorting/reordering input never reassigns.                                                                                                                       |
| `domainMode: 'data'`           | **data**   | Legacy rebuild-per-render: first-seen from current data only, `prevState` ignored. Returned state is still well-formed JSON.                                                                                                                                                                                                                                                                       |
| `onExhaust: 'cycle'` (default) | any        | Assign past the range and cycle at lookup; emit `palette-exhausted` **once ever** (latched in state, survives persistence). Stability holds while cycling.                                                                                                                                                                                                                                         |
| `onExhaust: 'error'`           | any        | Throw `PaletteExhaustedError` when a new value would need an index ≥ range length, or (pinned) when the explicit domain is longer than the range.                                                                                                                                                                                                                                                  |

Warning codes: `palette-exhausted`, `fingerprint-mismatch`, `version-mismatch`,
`out-of-domain` — each `{ code, message, values? }`, ready to feed the
advisories/warnings sink.

## 5. SSR adoption (sketch, tested)

Server trains statelessly (`prevState = null`), adapter embeds
`serializeScaleState(state)` in the SSR payload; client calls
`adoptScaleState` and passes the result as `prevState` on its first pipeline
run. Test asserts: client state deep-equals server state, colors identical (no
first-paint shift), and a later client-side new series appends at `nextIndex`
without touching SSR-era assignments. The "restored persisted state beats SSR
state" conflict rule from the plan is an adapter policy (which blob to pass as
`prevState`), not a core concern — nothing in the codec constrains it.

## 6. Edge cases discovered

1. **`domain` output vs. retained assignments** (semantic clarified, was
   ambiguous in the plan): grow-mode `result.domain` contains only values
   _present in this render_, ordered by stored assignment index (global
   first-seen order). Removed series keep their assignment in `state` but drop
   out of the visible domain/legend. First test run caught exactly this.
2. **Exhaustion latch must be persisted state** → `exhaustWarned` field (see §2).
3. **Palette changed while pinned**: pinned mode passes `prevState` through
   without touching its fingerprint. When the explicit domain is later removed,
   the normal fingerprint check runs — if the palette also changed during the
   pinned period, suspended assignments are then (correctly) discarded with a
   notice. No special case needed.
4. **Explicit domain longer than range** participates in the exhaustion
   contract too (cycle-warn / error), not only grow mode.
5. **Duplicate explicit-domain entries** deduplicate to first position.
6. **Invalid `Date`** needs its own encoding (`@d:NaN`) — `String(NaN)` inside
   the millis slot would otherwise decode to epoch-NaN anyway, but the explicit
   token keeps the format greppable and symmetric with `@n:NaN`.
7. **`Number`↔`String` number round-trip** is exact for all doubles (shortest
   round-trip repr is a JS spec guarantee), so no bit-level encoding needed.

## 7. What M0c / M1 must know

- **Commit protocol**: `trainDiscrete` is pure — it never mutates `prevState`.
  The adapter commits `result.state` only after a successful latest-run
  pipeline pass (run-id gating), which gives the plan's transactionality for free.
- **Scale identity**: state is keyed per scale name (`color`, `fill`, …) per
  plot, _outside_ this module — `trainDiscrete` handles one scale's state. The
  container is `Record<scaleName, ScaleState>` in the adapter/pipeline.
- **Range must arrive resolved**: the spec here takes `range` (resolved values)
  plus optional `scheme` (name, fingerprint identity). Scheme→range resolution
  happens upstream in scale setup; exhaustion math uses `range.length`.
- **Legend `order` option** (`stable-domain | present-first-seen | sorted`) is a
  display-layer reorder of `result.domain` — it must never touch `indexOf`.
- **`fingerprint-mismatch` / `palette-exhausted` warnings** should route to the
  advisories channel with `howToOverride` text (explicit domain / bigger range /
  `onExhaust`).
- **Continuous `'grow'`** (monotone-widening extent + `resetScales()`) is a
  separate, simpler mechanism — nothing here constrains it; `ScaleState` v2 can
  add an extent variant behind the same version field if we want one blob.
- **Version bumps**: any change to the codec tags, fingerprint recipe, or state
  fields must bump `SCALE_STATE_VERSION`; old states degrade to fresh + warning
  by design (never a hard failure).
- The spike is throwaway; port the module and both test files
  (`spikes/pure/tests/key-codec.test.ts`, `spikes/pure/tests/scale-state.test.ts`)
  nearly verbatim into `@ggsvelte/core` scale training in M0c/M1.
