---
"@ggsvelte/spec": patch
---

# Preserve precise TypeBox union diagnostics

Report extra channel and data keys against the active union form, reject named
references inside inline-only dataset entries, and preserve the generic
`SpecModule.Import` signature used by downstream TypeScript consumers.
