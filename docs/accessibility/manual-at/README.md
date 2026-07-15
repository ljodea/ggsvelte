# Manual assistive-technology verification

Automated axe and semantic tests are the release floor, not a substitute for
screen-reader verification. A release record is one atomic manifest at
`records/v<release>.json`; it must cover the complete pairing and settings
matrix enforced by `packages/spec/tests/manual-at-schema.test.ts`.

Use the versioned steps and assertions in `procedures.json`. Record the exact
platform, browser and assistive-technology versions, relevant speech or visual
state actually observed, and the public fixture used. Keep observations concise
and never include personal data.

Final records permit only `pass` or `accepted`. An accepted observation must
reference a GitHub issue listed in `acceptedIssues`, and that issue's scope must
name the exact `run/flow/assertion` path. `pending`, `fail`, and `blocked` remain
available only for draft work based on `template.json`.

The four baseline browser/AT pairings are VoiceOver with Safari and Chrome on
macOS, and NVDA with Firefox and Chrome on Windows. Variant runs cover reduced
motion, high contrast or forced colors, 200% browser zoom, a large pointer, and
real touch-only assistive technology. Playwright, axe, or touch emulation cannot
be reported as a manual AT pass.

The reproducible evidence harnesses are documented for
[VoiceOver on macOS](./macos-voiceover.md),
[NVDA on Windows](./harness/windows-nvda.md), and
[TalkBack on Android](./mobile-harness.md). Their retained transcripts and
screenshots support review; only the complete versioned manifest is the release
gate.

For a patch release that changes only packaging, documentation, or release
automation, `records/v<release>.json` may instead use
`record-alias.schema.json` to inherit an earlier record in the same major/minor
line. The alias must identify the release commit, declare that runtime behavior
did not change, and explain why the inherited matrix remains applicable. Any
runtime or interaction change requires a new complete record; an alias must
never be used to represent unperformed manual testing as new evidence.
