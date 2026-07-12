# 0004 — Schema source of truth: TypeBox over Zod v4

- **Status**: accepted
- **Date**: 2026-07-10
- **Spike**: M0a-4 (`spikes/schema-source/`, throwaway — deleted after this record; nothing committed)
- **Question**: which library authors the ggsvelte spec — Zod v4 (`z.infer` + runtime validation + `z.toJSONSchema`) or TypeBox (JSON-Schema-native, `Static<>` types)? Judged primarily on the quality of the **emitted JSON Schema for LLM constrained decoding**.

## Decision

**TypeBox (0.34.x) is the source of truth for `@ggsvelte/spec`.** The TypeBox definitions _are_ the published JSON Schema (via `Type.Module` for named `$defs`); `Static<>` provides the TS types; runtime validation uses TypeBox `Value` (or compiled ajv) with a custom discriminator-aware error mapper (which the plan requires us to build regardless — `{ code, path, message, fix }` with "did you mean").

## Method

Both libraries modeled the identical spec subset from the plan: `ChannelValue` = `{field} | {value, scale?} | {stat} | null` (no bare strings), `Aes` (8 channels), `LayerSpec` discriminated by `geom` for `point`/`histogram`/`smooth` with per-geom params (`bins` int 1–1000, `method: 'lm'|'loess'`, `span` 0–1, …), `PlotSpec` with three data forms (`values`/`columns`/`name`), `layers` minItems 1, `labs`, `theme`. Every field carries a description; geom descriptions include trigger vocabulary ("scatter plot, dots, correlation…"). Strict objects everywhere (`additionalProperties: false`).

Versions: zod 4.4.3, @sinclair/typebox 0.34.50, ajv 8.20.0 (Ajv2020), bun 1.3.6, tsc 5.9 with the repo's strict `exactOptionalPropertyTypes` tsconfig.

Four emitted-schema variants were measured: zod default (inline), zod `reused: "ref"` (auto `$defs`), zod with registry ids (named `$defs` — the shippable zod form), TypeBox plain (inline), TypeBox `Type.Module` (named `$defs` — the shippable TypeBox form).

## Comparison table

| Criterion                                                       | Zod v4                                                                                                                                                                                                     | TypeBox                                                                                                                                                                        | Winner                                                                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Discriminated union emission                                    | `oneOf` (no option to emit `anyOf`; needs `override` hook or post-processing)                                                                                                                              | `anyOf` natively                                                                                                                                                               | **TypeBox** — `anyOf` is the only union keyword in the OpenAI structured-outputs subset; `oneOf` is rejected                     |
| Discriminator hints                                             | none (`discriminator` keyword not emitted)                                                                                                                                                                 | none                                                                                                                                                                           | tie (neither emits OpenAPI-style `discriminator`)                                                                                |
| `additionalProperties: false`                                   | yes, from `z.strictObject`                                                                                                                                                                                 | yes, explicit per object                                                                                                                                                       | tie                                                                                                                              |
| `null` in channel union                                         | clean `{"type":"null"}` branch, description preserved                                                                                                                                                      | same                                                                                                                                                                           | tie                                                                                                                              |
| Descriptions preserved                                          | all 61 preserved (incl. as `$ref` siblings) — but registry `.add({id})` **replaces** meta; must merge or use `.meta({id})` at definition                                                                   | all preserved; per-use description via `Type.Ref(x, {description})`                                                                                                            | tie (both have one footgun)                                                                                                      |
| Record (`data.columns`) emission                                | `additionalProperties: <schema>` + redundant `propertyNames: {"type":"string"}` (unsupported keyword; deletable no-op)                                                                                     | `patternProperties: {"^(.*)$": <schema>}` (unsupported keyword **carrying the value schema**; needs rewrite, not deletion)                                                     | **Zod** (closer to portable form)                                                                                                |
| Named-defs size (minified)                                      | 7 969 B, depth 9, 21 `$ref`                                                                                                                                                                                | 6 738 B, depth 10, 25 `$ref`                                                                                                                                                   | ~tie                                                                                                                             |
| Inline size (minified)                                          | 44 242 B, depth 16                                                                                                                                                                                         | 44 285 B, depth 16                                                                                                                                                             | tie (both need refs)                                                                                                             |
| Named-defs ref style                                            | `#/$defs/Name` (standard JSON Pointer)                                                                                                                                                                     | `$ref: "Name"` anchored by `$id` (needs pointer rewrite for strict provider subsets)                                                                                           | **Zod**                                                                                                                          |
| Def naming                                                      | opaque `__schema0…77` unless every shared schema gets a registry id                                                                                                                                        | names are the `Type.Module` keys by construction                                                                                                                               | **TypeBox**                                                                                                                      |
| Control over emitted keywords                                   | projection via `z.toJSONSchema` (+ `override` escape hatch); emitter behavior can shift across zod versions                                                                                                | you author the JSON Schema directly; what you write is what ships                                                                                                              | **TypeBox**                                                                                                                      |
| ajv verdict parity (13 fixtures × all validators, 91 bun tests) | 13/13 match runtime                                                                                                                                                                                        | 13/13 match runtime                                                                                                                                                            | tie _in this subset_ — zod invites `.refine()`/transforms that silently don't emit; TypeBox can't express what JSON Schema can't |
| Runtime error quality (raw material for error mapper)           | **excellent**: discriminator-aware, deep paths (`layers.0.params.bins`: "Too big: expected number to be <=1000"; unknown geom: "Invalid discriminator value. Expected 'point' \| 'histogram' \| 'smooth'") | poor at unions: top error is `/layers/0` "Expected union value"; correct inner error exists but only via nested `error.errors` drill-down mixed with noise from all 3 branches | **Zod**                                                                                                                          |
| `exactOptionalPropertyTypes` (repo tsconfig)                    | `z.infer` optionals are `title?: string \| undefined`; **not assignable** to hand-written exact-optional interfaces (TS2375)                                                                               | `Static<>` optionals are exact (`title?: string`); assigns clean, rejects explicit `undefined`                                                                                 | **TypeBox**                                                                                                                      |
| Type narrowing on `geom`, wrong-param rejection                 | correct                                                                                                                                                                                                    | correct                                                                                                                                                                        | tie                                                                                                                              |
| Authoring ergonomics                                            | terse, chainable                                                                                                                                                                                           | verbose; reusing a schema with a different description requires re-wrapping; `Type.Module` uses string refs (no go-to-definition)                                              | **Zod**                                                                                                                          |

## Worst divergence: the discriminated `LayerSpec` union

The same source concept emits structurally different unions, and produces opposite-quality errors.

**Zod v4** (named-defs variant) — `oneOf`:

```json
"LayerSpec": {
  "oneOf": [
    { "$ref": "#/$defs/PointLayer" },
    { "$ref": "#/$defs/HistogramLayer" },
    { "$ref": "#/$defs/SmoothLayer" }
  ],
  "description": "One plot layer. The geom field selects the geometry and determines which params are allowed."
}
```

**TypeBox** (`Type.Module`) — `anyOf`:

```json
"LayerSpec": {
  "anyOf": [
    { "$ref": "PointLayer" },
    { "$ref": "HistogramLayer" },
    { "$ref": "SmoothLayer" }
  ],
  "description": "One plot layer. The geom field selects the geometry and determines which params are allowed."
}
```

OpenAI's structured-output grammar supports `anyOf` but **not `oneOf`**; zod has no emitter option to choose the union keyword, so its output needs an `override` hook or a post-pass. TypeBox's `$ref: "PointLayer"` ($id-anchored) conversely needs a trivial rewrite to `#/$defs/PointLayer` for strict consumers — a mechanical string transform, versus semantically re-keying zod's unions.

Runtime errors for the same invalid spec `{ layers: [{ geom: "histogram", params: { bins: 5000 } }] }`:

- **zod**: one issue — `code: "too_big"`, `path: layers.0.params.bins`, "Too big: expected number to be <=1000". Directly mappable to the plan's `{ code, path, message, fix }` contract.
- **TypeBox**: top-level `type 62`, path `/layers/0`, "Expected union value"; the real error (`/layers/0/params/bins` "Expected integer to be less or equal to 1000") is only reachable by iterating nested `error.errors`, interleaved with false-branch noise ("Expected 'point'", "Unexpected property", "Expected 'smooth'"). The error mapper must implement discriminator-first branch selection (match `geom` const, then surface that branch's errors) — estimated a few dozen lines, fully under our control.

Second divergence worth recording — `z.record` vs `Type.Record` for `data.columns`:

```json
// zod:                                   // TypeBox:
{ "type": "object",                       { "type": "object",
  "propertyNames": {"type": "string"},      "patternProperties": {
  "additionalProperties": {                   "^(.*)$": { "type": "array", ... }
    "type": "array", ... } }                } }
```

Both keywords are outside strict provider subsets. Zod's `propertyNames: {type:"string"}` is a deletable no-op; TypeBox's `patternProperties` carries the value schema and must be rewritten to `additionalProperties` (or the record authored as `Type.Unsafe`/raw object with `additionalProperties`). Since we author TypeBox schemas directly, we simply won't use `Type.Record` on agent-facing surfaces.

## Validation matrix

5 valid fixtures (minimal; full 3-layer; histogram+columns; smooth+named data; all channel forms) and 8 invalid fixtures (wrong-geom params, bad enum, bare-string channel, extra top-level prop, empty layers, bins>1000, non-integer bins, unknown geom) were run against: zod runtime, TypeBox `Value.Check` (plain and Module), and ajv compiled against all five emitted schema variants. **All verdicts matched expectations for every validator — 0 mismatches, 91/91 bun tests pass.** Both libraries' emitted schemas are faithful to their runtime semantics for this subset.

## Constrained-decoding fitness notes (both libraries)

Independent of the library choice, the published "strict profile" of the schema needs a publish-time transform:

- OpenAI structured outputs: `anyOf` supported (with restrictions), `oneOf` not; `$defs` + `#/$defs/...` pointers supported; ~5 levels of object nesting; value constraints (`minimum`/`maximum`/`pattern`/`format`) largely not enforced; all properties must be `required` with `additionalProperties: false` (optionality expressed as `anyOf` with `null`).
- Anthropic structured outputs: numeric bound keywords have caused hard 400s when passed unsanitized (SDKs strip them and fold constraints into descriptions); top-level union keywords disallowed on tool `input_schema`.
- Consequence: `bins` 1–1000, `alpha` 0–1, `span` 0–1 should ALSO be stated in descriptions (they already are in this spike's vocabulary), because grammar engines may ignore or reject the numeric keywords. The strict-profile emitter (planned in `@ggsvelte/spec`) will: inline-or-rewrite refs as needed, convert optional properties per provider, drop/fold unsupported keywords. Owning the schema as plain data (TypeBox) makes this transform straightforward and version-stable.

Sources: [OpenAI structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs), [Anthropic structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [vercel/ai#14342 (Anthropic 400s on unsupported keywords)](https://github.com/vercel/ai/issues/14342), [dsaiztc.com on OpenAI JSON-schema limitations](https://dsaiztc.com/blog/posts/navigating-openai-json-structured-outputs.html).

## Rationale

1. **The judging criterion is the emitted schema, and TypeBox emits the right one by construction.** `anyOf` discriminated unions (the exact `oneOf`-vs-`anyOf` quality this spike was chartered to judge), no surprise keywords, and total keyword-level control for the strict-profile transform. Zod's emission is a projection we don't control: `oneOf` for discriminated unions with no option to change it, `propertyNames` injected for records, opaque `__schemaN` defs unless every shared schema is registered — each fixable, but each fix is coupling to emitter internals that can shift across zod versions.
2. **`exactOptionalPropertyTypes` compatibility.** The repo compiles with exact optional types; TypeBox `Static<>` types satisfy hand-written exact-optional interfaces; `z.infer` types (`?: T | undefined`) fail assignment (TS2375) and would smear `| undefined` through `@ggsvelte/core` and `@ggsvelte/svelte`.
3. **One artifact, no drift.** With TypeBox, the published JSON Schema, the runtime validator input, and the TS types are the same object — the schema-faithfulness property this spike verified (13/13) is guaranteed by construction, not by discipline. Zod's richer runtime (refinements, transforms) is precisely the surface where runtime behavior and emitted schema can silently diverge.

**Accepted cost**: zod's union errors are strictly better raw material for the agent-facing error mapper. We pay for TypeBox with a discriminator-aware error walk (select branch by `geom` const, surface that branch's nested errors) inside the mapper we were building anyway. **Mitigations adopted**: no `Type.Record` on agent-facing surfaces; publish-time pointer-ref rewrite (`$ref: "X"` → `#/$defs/X`) plus provider strict-profile transforms; constraints duplicated in descriptions.
