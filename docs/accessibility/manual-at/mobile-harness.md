# Real mobile assistive-technology evidence

`Manual AT Mobile Evidence` is an intentionally manual GitHub Actions workflow.
It boots an Android emulator, builds a pinned revision of Google's open-source
TalkBack, enables the actual TalkBack accessibility service, opens the current
ggsvelte docs build in real Chrome, and injects Android touchscreen gestures.

The workflow does **not** use Playwright's touch emulation, an accessibility-tree
snapshot, or a mock screen reader. TalkBack's own `SpeechController` verbose log
is the speech transcript. Its documented speech overlay is also enabled in the
screenshots. The artifact binds the transcript to Android, Chrome, the TalkBack
source commit, the TalkBack APK checksum, the gesture sequence, and screenshots.

## Run it

1. Open **Actions → Manual AT Mobile Evidence → Run workflow**.
2. Leave the fixture URL at its default to test the current checkout's locally
   served inspection example. Use a different emulator-reachable URL only for a
   targeted follow-up.
3. Download `manual-at-talkback-chrome-<run id>`.
4. Review `fixture-speech.log`, `gestures.tsv`, the screenshots, and
   `environment.txt`. Copy relevant observed utterances into the release's
   manual AT record; this artifact is evidence, not an automatic pass verdict.

The job fails clearly when Chrome is absent, the TalkBack APK cannot be built or
enabled, TalkBack emits no speech, or accessibility focus never reaches the
ggsvelte fixture. A failure must never be converted into a passing manual record.

## Coverage boundary

The harness exercises touch-driven TalkBack linear exploration and activation.
It is useful evidence for touch-only inspection, pinning, ordinary DOM tooltip
content, and recovery controls. Android's basic `input` command cannot produce a
two-contact pass-through gesture while TalkBack owns the one-finger gesture
stream, so this harness does not claim that it manually verifies a two-finger
brush. Keep rectangle brushing in the separate touch-only manual procedure until
a physical-device or trustworthy multi-touch injector is available.

iOS Simulator is also excluded: simulator VoiceOver is not a substitute for
VoiceOver running on an iPhone or iPad, and GitHub-hosted macOS runners do not
provide a physical iOS touch device. Record iOS VoiceOver only from real hardware.
