// Android hardware/gesture back button was closing the app instead of navigating
// back through in-app screens. Root cause: App.jsx tracked the current screen with
// plain React state (no browser/native history), so Capacitor's default back-button
// behavior (go back in WebView history, else exit) always fell through to exit.
// No tracker ticket covers this yet — reported directly in session, not via a fix plan.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const MOBILE_PACKAGE_JSON = path.join(REPO_ROOT, 'apps', 'mobile', 'package.json');
const CAPACITOR_CONFIG = path.join(REPO_ROOT, 'capacitor.config.json');

describe('Android back button — retraces in-app screen history instead of exiting', () => {
  it('test_android_back_button_dependency_and_plugin_registered: @capacitor/app installed and allowlisted', () => {
    const pkg = JSON.parse(readFileSync(MOBILE_PACKAGE_JSON, 'utf8'));
    expect(pkg.dependencies['@capacitor/app']).toBeTruthy();

    const config = JSON.parse(readFileSync(CAPACITOR_CONFIG, 'utf8'));
    expect(config.includePlugins).toContain('@capacitor/app');
  });

  it('test_android_back_button_go_pushes_screen_history: go() pushes the outgoing screen onto a stack', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/import \{ App as CapacitorApp \} from "@capacitor\/app";/);
    expect(app).toMatch(/var screenStackRef = useRef\(\[\]\);/);

    const goSlice = app.slice(app.indexOf('function go(s) {'), app.indexOf('function resetScreen'));
    expect(goSlice).toMatch(/screenStackRef\.current = \[\.\.\.screenStackRef\.current, screen\];/);
    expect(goSlice).toMatch(/setScreen\(s\);/);
  });

  it('test_android_back_button_reset_clears_history: context resets (sign-out, onboarding, deep links) clear the stack', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    const resetSlice = app.slice(app.indexOf('function resetScreen'), app.indexOf('var goBack'));
    expect(resetSlice).toMatch(/screenStackRef\.current = \[\];/);

    // Redirect/reset call sites use resetScreen, not a raw setScreen push.
    expect(app).toMatch(/if \(onboardingNav\.redirectToSchedule\) \{\s*resetScreen\("schedule"\);/);
    expect(app).toMatch(/if \(subscriptionState\.redirectToSubscription\) \{\s*resetScreen\("subscription"\);/);
    expect(app).toMatch(/resetScreen\("join-team"\);/);
    expect(app).toMatch(/resetScreen\("home"\);/);
  });

  it('test_android_back_button_pops_stack_or_exits: goBack pops the stack, or exits the app at root', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    const goBackSlice = app.slice(app.indexOf('var goBack = useCallback'), app.indexOf('useEffect(function () {\n    if (!Capacitor.isNativePlatform())'));
    expect(goBackSlice).toMatch(/stack\.length > 0/);
    expect(goBackSlice).toMatch(/setScreen\(prev\);/);
    expect(goBackSlice).toMatch(/CapacitorApp\.exitApp\(\);/);
  });

  it('test_android_back_button_listener_registered_native_only: backButton listener wired via Capacitor App plugin', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/if \(!Capacitor\.isNativePlatform\(\)\) return;/);
    expect(app).toMatch(/CapacitorApp\.addListener\("backButton", goBack\)/);
    // Listener cleanup — avoid duplicate handlers across re-renders.
    expect(app).toMatch(/listenerPromise\.then\(function \(listener\) \{ listener\.remove\(\); \}\);/);
  });
});
