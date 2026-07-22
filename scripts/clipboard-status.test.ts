import { describe, expect, test } from "bun:test";

import {
  briefCopyStatus,
  COPIED_STATUS,
  MANUAL_COPY_STATUS,
  MANUAL_LINK_COPY_STATUS,
} from "../apps/docs/src/lib/clipboard";
import {
  PLAYGROUND_SHARE_COPIED_STATUS,
  playgroundShareCopyStatus,
} from "../apps/docs/src/lib/playground-output-status";
import {
  PLAYGROUND_ACTIVE_FAILED_STATUS,
  PLAYGROUND_SAMPLE_DISCARD_CONFIRM,
  PLAYGROUND_UNDO_DISCARD_CONFIRM,
} from "../apps/docs/src/lib/playground-link-policy";

describe("briefCopyStatus", () => {
  test("returns Copied. or manual fallback", () => {
    expect(briefCopyStatus("copied")).toBe(COPIED_STATUS);
    expect(briefCopyStatus("manual")).toBe(MANUAL_COPY_STATUS);
  });
});

describe("playgroundShareCopyStatus", () => {
  test("returns share-specific copied or manual link status", () => {
    expect(playgroundShareCopyStatus("copied")).toBe(PLAYGROUND_SHARE_COPIED_STATUS);
    expect(playgroundShareCopyStatus("manual")).toBe(MANUAL_LINK_COPY_STATUS);
  });
});

describe("playground discard and failure copy", () => {
  test("locks confirm and active-fail status strings", () => {
    expect(PLAYGROUND_UNDO_DISCARD_CONFIRM).toContain("undo");
    expect(PLAYGROUND_SAMPLE_DISCARD_CONFIRM).toContain("sample");
    expect(PLAYGROUND_ACTIVE_FAILED_STATUS).toContain("stopped safely");
  });
});
