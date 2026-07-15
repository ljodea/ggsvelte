#!/usr/bin/env bash
set -euo pipefail

readonly TALKBACK_COMMIT="229212fdf5842191d0a93fc95d9ca1423b346866"
readonly TALKBACK_PACKAGE="com.android.talkback"
readonly TALKBACK_SERVICE="com.android.talkback/com.google.android.marvin.talkback.TalkBackService"
readonly CHROME_PACKAGE="com.android.chrome"
readonly TEST_URL="${MANUAL_AT_URL:-http://10.0.2.2:4173/examples/interactions/inspection}"
readonly OUTPUT_DIR="${MANUAL_AT_OUTPUT_DIR:-${PWD}/artifacts/manual-at-mobile}"
readonly APK="${OUTPUT_DIR}/talkback-${TALKBACK_COMMIT}.apk"

mkdir -p "${OUTPUT_DIR}/screenshots"

fail() {
  echo "::error::$*"
  adb shell dumpsys accessibility > "${OUTPUT_DIR}/accessibility-dump.txt" 2>&1 || true
  adb logcat -d > "${OUTPUT_DIR}/logcat-full.txt" 2>&1 || true
  adb exec-out screencap -p > "${OUTPUT_DIR}/screenshots/failure.png" 2>/dev/null || true
  exit 1
}

command -v adb >/dev/null || fail "adb is unavailable"
adb wait-for-device
[[ -f "${APK}" ]] || fail "TalkBack APK is missing: ${APK}"

adb shell pm path "${CHROME_PACKAGE}" >/dev/null 2>&1 || \
  fail "Chrome is not installed in this emulator image; this is not a real TalkBack/Chrome run"
adb install -r "${APK}" >/dev/null || fail "Could not install the pinned Google TalkBack APK"
adb shell pm path "${TALKBACK_PACKAGE}" >/dev/null 2>&1 || fail "TalkBack did not install"

# The source-built APK is debuggable. Set TalkBack's documented developer
# preferences before starting its service so verbose logs expose the exact
# text handed to the real speech engine. The on-screen speech overlay is a
# second, visual evidence channel in every screenshot.
prefs='<?xml version="1.0" encoding="utf-8" standalone="yes" ?><map><string name="pref_log_level">2</string><boolean name="pref_tts_overlay" value="true" /><boolean name="first_time_user" value="false" /><boolean name="has_training_exit" value="true" /><boolean name="has_onboarding_exit" value="true" /><boolean name="pref_update_welcome_16_2_shown_key" value="true" /></map>'
adb shell am force-stop "${TALKBACK_PACKAGE}"
printf '%s' "${prefs}" | adb shell "run-as ${TALKBACK_PACKAGE} sh -c 'mkdir -p /data/user_de/0/${TALKBACK_PACKAGE}/shared_prefs && cat > /data/user_de/0/${TALKBACK_PACKAGE}/shared_prefs/${TALKBACK_PACKAGE}_preferences.xml'" || \
  fail "Could not configure TalkBack verbose speech evidence"

adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 0
adb shell settings put system screen_off_timeout 1800000
adb shell wm size 1080x1920
adb shell wm density 420
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard

adb shell settings put secure enabled_accessibility_services "${TALKBACK_SERVICE}"
adb shell settings put secure accessibility_enabled 1
adb shell settings put secure touch_exploration_granted_accessibility_services \
  "${TALKBACK_SERVICE}"
adb shell settings put secure touch_exploration_enabled 1
sleep 8

adb shell dumpsys accessibility > "${OUTPUT_DIR}/accessibility-dump.txt"
grep -F "${TALKBACK_SERVICE}" "${OUTPUT_DIR}/accessibility-dump.txt" >/dev/null || \
  fail "The real TalkBack AccessibilityService is not enabled"
grep -E 'mIsTouchExplorationEnabled=true|touchExplorationEnabled=true' \
  "${OUTPUT_DIR}/accessibility-dump.txt" >/dev/null || \
  fail "TalkBack is enabled but Android did not grant touch exploration"

# Skip Chrome's first-run UI without replacing Chrome or its accessibility
# stack. This flag only removes account/onboarding screens from the fixture.
adb shell am set-debug-app --persistent "${CHROME_PACKAGE}"
adb shell 'echo "chrome --no-first-run --disable-fre --disable-default-apps" > /data/local/tmp/chrome-command-line'
adb shell am force-stop "${CHROME_PACKAGE}"
adb shell am start -W -a android.intent.action.VIEW -d "${TEST_URL}" "${CHROME_PACKAGE}" > \
  "${OUTPUT_DIR}/chrome-start.txt" || fail "Chrome could not open the test fixture"
sleep 12
adb exec-out screencap -p > "${OUTPUT_DIR}/screenshots/00-loaded.png"

# Clear setup chatter. Every later swipe and tap is injected through Android's
# touchscreen input path. TalkBack, not UIAutomator or Playwright, consumes the
# gestures and moves accessibility focus in real Chrome.
adb logcat -c
printf 'phase\tgesture\n' > "${OUTPUT_DIR}/gestures.tsv"

gesture() {
  local phase="$1"
  local command="$2"
  printf '%s\t%s\n' "${phase}" "${command}" >> "${OUTPUT_DIR}/gestures.tsv"
  adb shell "${command}"
  sleep 1
}

# Linear TalkBack exploration. Stop only after TalkBack itself speaks the
# plot's accessible name, so the following activation cannot silently target
# an unrelated page control.
plot_focused=false
for index in $(seq -w 1 60); do
  gesture "linear-${index}" "input swipe 260 1060 830 1060 220"
  if (( 10#${index} % 5 == 0 )); then
    adb exec-out screencap -p > "${OUTPUT_DIR}/screenshots/linear-${index}.png"
  fi
  if adb logcat -d -v brief | grep -Ei \
    'SpeechController.*Speaking fragment text=.*Inspect a shared x value, then pin' >/dev/null; then
    plot_focused=true
    echo "TalkBack reached the plot after $((10#${index})) right-swipe gestures"
    break
  fi
done
[[ "${plot_focused}" == "true" ]] || fail "TalkBack never focused the ggsvelte plot"

# Activate the currently focused accessibility node with TalkBack's standard
# double-tap gesture, then continue exploring to capture the resulting live
# region, pinned content, and recovery controls.
printf '%s\t%s\n' "activate" "input tap 540 1180; input tap 540 1180" >> \
  "${OUTPUT_DIR}/gestures.tsv"
adb shell 'input tap 540 1180; input tap 540 1180'
sleep 2
adb exec-out screencap -p > "${OUTPUT_DIR}/screenshots/25-activated.png"
for index in $(seq -w 26 34); do
  gesture "post-activate-${index}" "input swipe 260 1060 830 1060 220"
done

adb logcat -d -v threadtime > "${OUTPUT_DIR}/logcat-full.txt"
grep -E 'SpeechController.*Speaking fragment text=' "${OUTPUT_DIR}/logcat-full.txt" > \
  "${OUTPUT_DIR}/talkback-speech.log" || \
  fail "TalkBack ran, but its real speech pipeline emitted no auditable utterances"

grep -Ei 'ggsvelte|plot|chart|flipper|mass|species|datum|select area|zoom area|reset zoom|clear selection' \
  "${OUTPUT_DIR}/talkback-speech.log" > "${OUTPUT_DIR}/fixture-speech.log" || \
  fail "TalkBack spoke, but never reached the ggsvelte fixture"

{
  echo "url=${TEST_URL}"
  echo "android=$(adb shell getprop ro.build.version.release | tr -d '\r')"
  echo "api=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "device=$(adb shell getprop ro.product.model | tr -d '\r')"
  echo "chrome=$(adb shell dumpsys package ${CHROME_PACKAGE} | sed -n 's/.*versionName=//p' | head -1 | tr -d '\r')"
  echo "talkback_commit=${TALKBACK_COMMIT}"
  echo "talkback_apk_sha256=$(shasum -a 256 "${APK}" | awk '{print $1}')"
  echo "input=Android touchscreen events interpreted by enabled TalkBack service"
  echo "speech=TalkBack SpeechController verbose output"
} > "${OUTPUT_DIR}/environment.txt"

# Never leave an emulator service enabled after evidence collection.
adb shell settings put secure accessibility_enabled 0
adb shell settings delete secure enabled_accessibility_services
adb shell settings delete secure touch_exploration_granted_accessibility_services
adb shell settings put secure touch_exploration_enabled 0

echo "Real TalkBack/Chrome evidence captured in ${OUTPUT_DIR}"
wc -l "${OUTPUT_DIR}/talkback-speech.log" "${OUTPUT_DIR}/fixture-speech.log"
