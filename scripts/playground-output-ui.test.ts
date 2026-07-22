import { describe, expect, test } from "bun:test";

import {
  clampOutputTabIndex,
  copySessionMatchesOutputs,
  playgroundDiagnosticSignature,
  shouldFocusDiagnosticsAlert,
} from "../apps/docs/src/lib/playground-output-ui";

describe("clampOutputTabIndex", () => {
  test("keeps in-range indices and clamps OOB to 0", () => {
    expect(clampOutputTabIndex(1, 3)).toBe(1);
    expect(clampOutputTabIndex(0, 3)).toBe(0);
    expect(clampOutputTabIndex(3, 3)).toBe(0);
    expect(clampOutputTabIndex(5, 2)).toBe(0);
  });

  test("empty list yields 0", () => {
    expect(clampOutputTabIndex(2, 0)).toBe(0);
  });
});

describe("copySessionMatchesOutputs", () => {
  test("matches only the same reference", () => {
    const a = [{ kind: "svelte" }];
    const b = [{ kind: "svelte" }];
    expect(copySessionMatchesOutputs(a, a)).toBe(true);
    expect(copySessionMatchesOutputs(a, b)).toBe(false);
    expect(copySessionMatchesOutputs(null, a)).toBe(false);
  });
});

describe("playgroundDiagnosticSignature", () => {
  test("joins source:code:path and detects new focus targets", () => {
    const signature = playgroundDiagnosticSignature([
      { source: "validation", code: "invalid-json", path: "" },
      { source: "playground", code: "share-limit", path: "draft" },
    ]);
    expect(signature).toBe("validation:invalid-json:|playground:share-limit:draft");
    expect(shouldFocusDiagnosticsAlert(signature, "")).toBe(true);
    expect(shouldFocusDiagnosticsAlert(signature, signature)).toBe(false);
    expect(shouldFocusDiagnosticsAlert("", "x")).toBe(false);
  });
});
