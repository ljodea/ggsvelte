---
"@ggsvelte/spec": patch
---

# Hoist timezone validation off the per-row parse path

Migration: none — same parse results and failure messages; fewer allocations
when a column shares one timezone option.

`timezoneValidationFailure` uses a module-level UTC-alias Set and caches the
full `TemporalParseResult` (or null) so repeated checks for the same zone do
not rebuild the alias array or re-allocate invalid-zone failures.
