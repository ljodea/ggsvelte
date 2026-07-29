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

Migration: none — additive for new structural-gate exports; CLI still validates
with TypeBox while browser render uses normalize + structural gates only
