#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  elif command -v /usr/libexec/java_home >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home)"
  fi
fi

if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/Library/Android/sdk" ]]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set. Install JDK 17+ or Android Studio." >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo "ANDROID_HOME is not set. Install the Android SDK or Android Studio." >&2
  exit 1
fi

# Matches CI: release APK is signed with the debug keystore for validation only.
export GITHUB_ACTIONS="${GITHUB_ACTIONS:-true}"

cd "$root_dir/android"
./gradlew assembleRelease --no-daemon

apk_path="app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$apk_path" ]]; then
  echo "Expected APK was not produced: $apk_path" >&2
  exit 1
fi

echo "Built android/$apk_path"
