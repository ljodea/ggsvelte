import { describe, expect, test } from "bun:test";

const script = await Bun.file(new URL("./run-talkback-chrome.sh", import.meta.url)).text();

describe("TalkBack Chrome evidence harness", () => {
  test("dismisses Chrome onboarding before enabling TalkBack", () => {
    const preload = script.indexOf("dismiss_chrome_onboarding");
    const enable = script.indexOf("accessibility_ready=false");

    expect(preload).toBeGreaterThan(-1);
    expect(enable).toBeGreaterThan(preload);
  });

  test("refuses to explore while Chrome onboarding obscures the fixture", () => {
    expect(script).toContain('fail "Chrome onboarding still obscures the test fixture"');
    expect(script).toContain('text="Chrome notifications make things easier"');
  });

  test("uses visible touch exploration without pretending ADB swipes are TalkBack gestures", () => {
    expect(script).toContain("#try-it-heading");
    expect(script).toContain("android.permission.READ_PHONE_STATE");
    expect(script).toContain('gesture "explore-${index}" "input tap ${point}"');
    expect(script).not.toContain('gesture "linear-${index}" "input swipe');
  });
});
