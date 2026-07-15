#!/usr/bin/env bash

set -euo pipefail

browser="${1:-}"
profile="${2:-baseline}"
base_url="${BASE_URL:-http://127.0.0.1:4173}"
output_root="${OUTPUT_ROOT:-artifacts/manual-at/macos}"

if [[ "${browser}" != "safari" && "${browser}" != "chrome" ]]; then
  echo "usage: $0 <safari|chrome> [baseline|reduced-motion|high-contrast|browser-zoom-200|large-pointer]" >&2
  exit 64
fi

case "${profile}" in
  baseline | reduced-motion | high-contrast | browser-zoom-200 | large-pointer) ;;
  *)
    echo "unsupported profile: ${profile}" >&2
    exit 64
    ;;
esac

run_dir="${output_root}/${browser}-${profile}"
mkdir -p "${run_dir}/screenshots"

cleanup() {
  # VoiceOver is never intentionally left running on a developer machine or
  # an ephemeral runner, including after an assertion or permissions failure.
  perl -e 'alarm shift; exec @ARGV' 10 \
    osascript -e 'tell application "VoiceOver" to quit' >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

curl --fail --silent --show-error --retry 20 --retry-delay 1 \
  "${base_url}/examples/interactions/inspection" >/dev/null

system_metadata="${run_dir}/system.txt"
{
  sw_vers
  printf 'hardware: '
  uname -m
  printf 'profile: %s\n' "${profile}"
  if [[ "${browser}" == "safari" ]]; then
    defaults read /Applications/Safari.app/Contents/Info CFBundleShortVersionString
  else
    defaults read "/Applications/Google Chrome.app/Contents/Info" CFBundleShortVersionString
  fi
} >"${system_metadata}"

# These profiles change only public macOS accessibility preferences. The JXA
# driver records the selected profile and captures the visible result. Each
# workflow job runs on a disposable VM; local callers should use baseline
# unless they explicitly want the setting changed for the duration of the run.
case "${profile}" in
  reduced-motion)
    defaults write com.apple.universalaccess reduceMotion -bool true
    ;;
  high-contrast)
    defaults write com.apple.universalaccess increaseContrast -bool true
    defaults write com.apple.universalaccess reduceTransparency -bool true
    ;;
  large-pointer)
    defaults write com.apple.universalaccess mouseDriverCursorSize -float 4
    ;;
esac

/System/Library/CoreServices/VoiceOver.app/Contents/MacOS/VoiceOverStarter

# A timeout is important here. If TCC/Automation permissions are unavailable,
# asking VoiceOver for its last spoken phrase can otherwise wait indefinitely.
if ! perl -e 'alarm shift; exec @ARGV' 600 \
  osascript -l JavaScript \
  "$(dirname "$0")/voiceover-driver.jxa" \
  "${browser}" "${profile}" "${base_url}" "${run_dir}"; then
  echo "VoiceOver evidence run failed. The partial transcript and screenshots are retained in ${run_dir}." >&2
  exit 1
fi

if [[ ! -s "${run_dir}/transcript.jsonl" ]]; then
  echo "VoiceOver produced no transcript; refusing to report a pass." >&2
  exit 1
fi

echo "VoiceOver evidence written to ${run_dir}"
