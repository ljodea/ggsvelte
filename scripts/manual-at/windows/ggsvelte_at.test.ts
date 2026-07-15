import { describe, expect, test } from "bun:test";

const source = await Bun.file(new URL("./ggsvelte_at.py", import.meta.url)).text();

describe("NVDA headed-browser focus boundary", () => {
  test("retains the matched browser HWND and verifies foreground ownership", () => {
    expect(source).toContain("_browser_hwnd: int | None = None");
    expect(source).toContain("user32.GetForegroundWindow() == _browser_hwnd");
  });

  test("reasserts browser focus immediately before both physical key chords", () => {
    const helperStart = source.indexOf("def _speech_after_key(");
    const helperEnd = source.indexOf("\ndef _record(", helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helper.match(/_ensure_browser_foreground\(\)/g)).toHaveLength(3);
    expect(
      helper.indexOf('_ensure_browser_foreground()\n    _send_key("control")'),
    ).toBeGreaterThan(-1);
    expect(
      helper.indexOf("_ensure_browser_foreground()\n    _send_key(key, modifiers)"),
    ).toBeGreaterThan(-1);
    expect(
      helper.indexOf('_ensure_browser_foreground()\n        _send_key("control")'),
    ).toBeGreaterThan(-1);
  });

  test("hides the hosted runner console before launching the browser", () => {
    expect(source).toContain('"hosted-compute-agent"');
    expect(source).toContain('"hostedcomputeagent"');
    expect(source).toContain("user32.ShowWindow(hwnd, 0)");
    expect(
      source.indexOf(
        "_hide_runner_infrastructure_windows()\n    _browser_process = subprocess.Popen(args)",
      ),
    ).toBeGreaterThan(-1);
  });
});
