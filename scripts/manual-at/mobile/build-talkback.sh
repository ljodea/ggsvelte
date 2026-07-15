#!/usr/bin/env bash
set -euo pipefail

# Pin the exact Google TalkBack source used for an evidence run. Updating this
# value is an intentional manual review: speech behavior is part of the test.
readonly TALKBACK_REPOSITORY="https://github.com/google/talkback.git"
readonly TALKBACK_COMMIT="229212fdf5842191d0a93fc95d9ca1423b346866"
readonly WORK_DIR="${RUNNER_TEMP:-/tmp}/ggsvelte-talkback"
readonly OUTPUT_DIR="${1:-${PWD}/artifacts/manual-at-mobile}"

: "${ANDROID_HOME:?ANDROID_HOME must point at the Android SDK}"
command -v git >/dev/null
command -v gradle >/dev/null

rm -rf "${WORK_DIR}"
git clone --filter=blob:none --no-checkout "${TALKBACK_REPOSITORY}" "${WORK_DIR}"
git -C "${WORK_DIR}" checkout --detach "${TALKBACK_COMMIT}"

actual_commit="$(git -C "${WORK_DIR}" rev-parse HEAD)"
if [[ "${actual_commit}" != "${TALKBACK_COMMIT}" ]]; then
  echo "::error::TalkBack checkout is ${actual_commit}, expected ${TALKBACK_COMMIT}"
  exit 1
fi

(
  cd "${WORK_DIR}"
  ANDROID_SDK="${ANDROID_HOME}" GRADLE_STACKTRACE=--stacktrace ./build.sh
)

apk="$(find "${WORK_DIR}" -type f -path '*/outputs/apk/*debug*.apk' -print -quit)"
if [[ -z "${apk}" ]]; then
  echo "::error::Google TalkBack built successfully but produced no debug APK"
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"
cp "${apk}" "${OUTPUT_DIR}/talkback-${TALKBACK_COMMIT}.apk"
printf '%s  %s\n' "$(shasum -a 256 "${apk}" | awk '{print $1}')" \
  "talkback-${TALKBACK_COMMIT}.apk" > "${OUTPUT_DIR}/talkback.sha256"
git -C "${WORK_DIR}" show -s --format='%H%n%aI%n%s' > "${OUTPUT_DIR}/talkback-source.txt"

echo "Built Google TalkBack ${TALKBACK_COMMIT}: ${OUTPUT_DIR}/talkback-${TALKBACK_COMMIT}.apk"
