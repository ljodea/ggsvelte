---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(core): type diagnostic codes at emit sites

PipelineWarning, Advisory, PipelineError, ScaleConfigError, and
ScaleDiagnostic code fields are catalog unions. Wrong codes fail at
compile time; the regex source scanner is retired (#1043).
