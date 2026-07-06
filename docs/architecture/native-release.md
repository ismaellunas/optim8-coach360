# Native release — Capacitor iOS & Android

> **Stack:** Vite + React + Capacitor 8  
> **App ID:** `com.coach360.app`  
> **Related:** [`tech-stack.md`](./tech-stack.md), [`best-practices.md`](./best-practices.md)

---

## Build workflow

Every native build starts from the Vite production bundle:

```bash
npm run build:cap    # vite build → dist/, then cap sync
# or separately:
npm run build
npm run cap:sync
```

`cap sync` copies `dist/` into:

| Platform | Web assets path |
|----------|-----------------|
| iOS | `ios/App/App/public/` |
| Android | `android/app/src/main/assets/public/` |

Open native IDEs:

```bash
npm run cap:ios       # Xcode
npm run cap:android   # Android Studio
```

Run `cap sync` after any change to web code, Capacitor plugins, or `capacitor.config.json`.

If `cap sync` fails on iOS with a pod/Xcode error but web assets copied successfully, run `xcodebuild -runFirstLaunch` or use `npx cap copy` for web-only changes until Xcode is repaired.

---

## Versioning

Keep versions aligned across three places:

| Source | Field | Current |
|--------|-------|---------|
| `package.json` | `version` | `0.0.0` (semver — bump before each store release) |
| iOS (`ios/App/App.xcodeproj/project.pbxproj`) | `MARKETING_VERSION` | User-facing version (e.g. `1.0.0`) |
| iOS | `CURRENT_PROJECT_VERSION` | Build number (integer, increment every upload) |
| Android (`android/app/build.gradle`) | `versionName` | User-facing version (e.g. `"1.0.0"`) |
| Android | `versionCode` | Build number (integer, increment every upload) |

**Release checklist:**

1. Bump `package.json` `version` (semver).
2. Set iOS `MARKETING_VERSION` = same semver; increment `CURRENT_PROJECT_VERSION`.
3. Set Android `versionName` = same semver; increment `versionCode`.
4. Run `npm run build:cap`.
5. Build release artifacts in Xcode / Android Studio (see signing below).

---

## iOS — signing & App Store

### Prerequisites

- Node.js **22+** for `@capacitor/cli` 8 (or use CLI 7 on Node 20 — see `package.json`).
- **iOS 15.0+** deployment target (required by Capacitor 8; set in `ios/App/Podfile` and Xcode project).
- Apple Developer Program membership ($99/year).
- Xcode installed (macOS only).
- Bundle ID `com.coach360.app` registered in [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list).

### Signing (Xcode)

1. Open `ios/App/App.xcworkspace` (`npm run cap:ios`).
2. Select the **App** target → **Signing & Capabilities**.
3. Choose your **Team**; enable **Automatically manage signing** for development.
4. For App Store distribution, create an **App Store Connect** app record and use a **Distribution** provisioning profile (manual or automatic).

### Archive & upload

1. Select **Any iOS Device (arm64)** as the run destination.
2. **Product → Archive**.
3. In the Organizer, **Distribute App** → **App Store Connect** → upload.
4. Complete metadata, screenshots, and review in [App Store Connect](https://appstoreconnect.apple.com).

### Simulator verification (development)

```bash
npm run build:cap
npm run cap:ios
# In Xcode: select an iOS Simulator → Run (⌘R)
```

Confirm the Coach360 UI loads and the status bar matches the dark theme (`#0C0C10`).

---

## Android — signing & Play Store

### Prerequisites

- [Google Play Console](https://play.google.com/console) developer account ($25 one-time).
- Android Studio installed.
- Application ID `com.coach360.app` matches `capacitor.config.json` `appId`.

### Debug builds (emulator)

```bash
npm run build:cap
npm run cap:android
# In Android Studio: select an emulator → Run
```

### Release keystore

Generate once and store securely (password manager / CI secrets — **never commit**):

```bash
keytool -genkey -v -keystore coach360-release.keystore \
  -alias coach360 -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/gradle.properties` (gitignored) or `~/.gradle/gradle.properties`:

```properties
COACH360_RELEASE_STORE_FILE=/absolute/path/to/coach360-release.keystore
COACH360_RELEASE_STORE_PASSWORD=***
COACH360_RELEASE_KEY_ALIAS=coach360
COACH360_RELEASE_KEY_PASSWORD=***
```

Wire signing in `android/app/build.gradle` `signingConfigs` + `buildTypes.release` when ready for first Play upload. Until then, debug builds use the automatic debug keystore.

### Play Store upload

1. **Build → Generate Signed Bundle / APK** → **Android App Bundle** (.aab).
2. Upload the `.aab` to Play Console → **Production** (or internal testing track first).
3. Complete store listing, content rating, and privacy policy.

---

## Native plugin verification

Configured in `capacitor.config.json` and initialized in `src/lib/capacitor.js` on app start.

| Plugin | Config | Verify on device |
|--------|--------|------------------|
| **StatusBar** | `style: dark`, `backgroundColor: #0C0C10` | Status bar is dark with app background; no white flash on launch |
| **Keyboard** | `resize: body`, `resizeOnFullScreen: true` | Open a text field (login name/email); keyboard pushes content up instead of covering inputs |

**Manual checklist (AC-4):**

- [ ] iOS Simulator: app launches after `build:cap`
- [ ] Android Emulator: app launches after `build:cap`
- [ ] iOS device/simulator: status bar style correct on Home and Login screens
- [ ] Android device/emulator: status bar / navigation bar colors match theme
- [ ] Both platforms: keyboard does not obscure login form fields

---

## CI/CD

Pipelines live in [`.github/workflows/`](../../.github/workflows/):

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | PR + push to `main` | Lint, typecheck, story tests, Android `assembleRelease` |
| Vercel Git (`apps/admin`) | Push to `main` | `build:admin` → production deploy on Vercel |
| GitHub Pages (`docs/`) | Push to `main` | Tracker + markdown docs (branch deploy) |

Environment promotion (dev → staging → prod), secrets, and rollback: [`environment-promotion.md`](../delivery/environment-promotion.md).

**CI Android note:** `assembleRelease` uses the debug keystore when `GITHUB_ACTIONS=true` so the pipeline validates the build without production signing secrets. Store uploads still require the release keystore documented above.

**iOS (future):** Archive and TestFlight upload require a macOS runner and Apple signing secrets — not in STORY-1.4 scope.

---

*Document version: 1.1 · STORY-1.4 · July 2026*
