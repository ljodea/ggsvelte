# Manual assistive-technology verification

Automated axe and semantic tests are the release floor, not a substitute for
screen-reader verification. Copy `template.json` for each release candidate
and record every required browser/AT pairing:

- VoiceOver with Safari and Chrome on macOS
- NVDA with Firefox and Chrome on Windows

Use only public keyboard and pointer interactions. Record the exact version,
fixture URL, steps, speech observed, expectation, result, and issue link. A
release record is complete only when every matrix entry is `pass` or links to
an explicitly accepted issue. Never put personal data in a record.

Committed records belong in this directory as `YYYY-MM-DD-<version>.json`.
The JSON Schema at `record.schema.json` is the machine-readable format.
