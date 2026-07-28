---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(data): correct the 2026 Kyoto bloom date and refresh the provenance

The 2026 row said 30 March (day 89). Peak bloom was 29 March (day 88). We
took the series from the George Mason mirror, which was committed four days
before Genki Katata published the authoritative 2026 entry; Our World in
Data carries 29 March too. Every other year checks out — all 827 shared
years match Aono's own `KyotoFullFlower7.xls`, and 2016–2025 match Katata's
continuation.

The provenance also needed refreshing. Aono's site closed on 2025-03-31 and
he has since died, so the notice now points at NOAA NCEI, which holds his
file, and at Katata (CIGS), who continues the series after it ends in 2015.
The header claimed direct observation "up to 1888"; upstream says the
modern full-bloom record starts in the 1880s. It now also states that the
dates are proleptic Gregorian throughout, so nobody goes looking for a
calendar seam at 1582.

The committed lesson chart SVGs move by one point.
