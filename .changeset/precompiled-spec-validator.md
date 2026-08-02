---
"@ggsvelte/spec": patch
---

# Startup: precompiled spec validator

Migration: none. `validate()` semantics are unchanged — pinned by a
differential test against a runtime-compiled TypeBox validator (17-spec
corpus + 500 fuzzed mutations, including exactOptionalPropertyTypes edge
cases).

The spec barrel no longer pays `Compile(PlotSpecSchema)` — seconds on a
loaded machine — at module load. The validator is a standalone module
precompiled at build time (`bun run validator:gen`, drift-gated by
`bun run validator:check`), checked into `packages/spec/src/generated/`.

Measured (loaded x86_64 box, dist builds):

- spec barrel import: **~2550 → ~250 ms**
- first `validate()` call: **~2765 → ~117 ms**
- `runPipeline` first call: unchanged (never typeboxed)
- every `ggsvelte-render` CLI invocation validates, so CLI startup drops
  by the same margin

Contributor note: after changing `PlotSpecSchema` or upgrading TypeBox,
run `bun run validator:gen` and commit the regenerated artifact.
