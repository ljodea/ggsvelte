# macOS VoiceOver evidence harness

`manual-at-macos.yml` runs the built documentation site in real Safari and
Google Chrome with the VoiceOver process supplied by macOS. It drives only the
public keyboard interaction model: Tab, arrow keys, Enter, Space, Escape, and
VoiceOver cursor navigation.

The harness reads VoiceOver's own `last phrase` AppleScript property and turns
on VoiceOver's caption panel for screenshots. It does not inspect the browser
accessibility tree, call axe, infer speech from DOM text, or substitute a speech
synthesizer. Missing Automation or Accessibility permission is therefore a
hard failure, never a synthetic pass.

## Run in GitHub Actions

Dispatch **Manual AT — macOS VoiceOver** and select a browser pairing and
profile. Run both browser pairings for every release. Repeat the relevant flows
under reduced motion, high contrast, 200% browser zoom, and large pointer. Real
touch-only assistive-technology testing remains a separate physical-device
procedure; macOS event emulation is not accepted as touch evidence.

Each job retains:

- `transcript.jsonl`, containing the exact successive phrases VoiceOver
  exposed after each user action;
- caption-panel screenshots for each assertion and any failure;
- exact macOS, architecture, browser, and profile metadata; and
- a failure note when a required announcement or navigable pinned member was
  not observed.

Download and review the artifact. Transfer exact observations—not expected
phrases—into the versioned manual-AT record. A green harness is useful evidence,
but does not replace human review of speech order, verbosity, visual state, or
the complete release matrix in [the manual verification guide](./README.md).

## Run on a local Mac

Build and serve the documentation site, then invoke the same driver:

```sh
bun install --frozen-lockfile
bun run build
bun run build:docs
bun scripts/serve-docs.ts &
scripts/manual-at/macos/run.sh safari baseline
```

VoiceOver Utility must allow AppleScript control, and the calling terminal must
have macOS Accessibility and Automation permission. The script always asks
VoiceOver to quit on exit. Non-baseline profiles change macOS accessibility
preferences, so use them locally only when you intend to change those settings.
