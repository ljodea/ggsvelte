# Windows NVDA evidence harness

The Windows job in `manual-at.yml` runs the real, installed NVDA 2026.1.1
screen reader against headed Chrome and Firefox on `windows-2022`. It is a
manual release gate, not ordinary pull-request CI.

## Reproducibility and trust boundaries

- NVDA comes from the official `nvaccess/nvda` release and is accepted only
  when its SHA-256 is
  `6e0289eb5a3aa076eb97ea99c5d5465cb48b5ecc6a3257dc3d811f881a1747c9`.
- The Robot Framework runner, sandbox profile, global plugin, and speech-spy
  synthesizer come from upstream NVDA commit
  `5d92106f17e461dac62aa48257bbbf4183e033d0`.
- Browser interaction crosses the public Win32 `SendInput` boundary. The
  harness does not call application DOM methods or use Playwright to perform
  the AT journey.
- Speech is captured by NVDA's upstream `speechSpySynthDriver` before any
  assertions. Every utterance is retained verbatim in `exact-speech.jsonl`.

The workflow also preserves the Robot report, final screenshots, NVDA debug
logs, browser and NVDA version metadata, fixture-server logs for local runs,
and installer log. These artifacts are evidence for review; they do not create
or silently approve a release record.

## Run it

From the GitHub Actions page, choose **Manual assistive-technology evidence**,
then **Run workflow**. Use `local` to build and serve the selected commit, or
`live` to verify the deployed GitHub Pages fixture. Set `release` to the release
whose records the run will support. Choose one display profile per run:

- `baseline` leaves the runner's display settings and browser zoom unchanged.
- `forced-colors` turns on actual Windows High Contrast with
  `SystemParametersInfo`, verifies it before launching the browser, and restores
  the original system state during teardown.
- `browser-zoom-200` sends the real browser Ctrl+Plus command until NVDA reports
  a 200 percent zoom level. The exact confirmation is retained as evidence.

Equivalent GitHub CLI invocations are:

```sh
gh workflow run manual-at.yml \
  -f target=local \
  -f release=0.1.0 \
  -f profile=baseline
gh run watch --exit-status
```

For post-deploy evidence, replace `target=local` with `target=live`. Repeat the
run with `profile=forced-colors` and `profile=browser-zoom-200`. Download both
browser artifacts for every profile and review their exact speech alongside the
corresponding record under `docs/accessibility/manual-at/`.

## What it exercises

Each browser performs the public keyboard journeys for grouped inspection,
pin, unpin, dismiss, narrow docked tooltip navigation, Select area, Clear
selection, Zoom area, and Reset zoom. Assertions reject duplicate grouped
axis/count/pin announcements. The docked tooltip journey switches NVDA into
browse mode and records ordinary-DOM navigation; the repository's DOM tests
separately ensure that complete pinned groups are not capped.

Touch-only, large-pointer, and reduced-motion variants remain human-observed
conditions in the release record. The forced-colors and browser-zoom profiles
produce real-system AT evidence, but they likewise do not replace a person's
screen-reader judgment.
