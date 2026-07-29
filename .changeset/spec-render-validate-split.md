---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

perf(spec): split render path off TypeBox schema validation

Browser chart bundles no longer load `schema-declarations` / `typebox/compile`
by default. `runPipeline` / `assemblePortableSpec` still run `normalize()` plus
TypeBox-free structural gates. Full schema `validate()` remains on the agent
path (`validate()`, builder `.spec()`, CLI).

Migration: none — agents and the CLI still use `validate()`; only the browser
render path drops TypeBox schema-shape checks. Structural gates (scheme family,
binned breaks, guides) still throw SpecValidationError from `runPipeline`.
