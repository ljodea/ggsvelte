import { describe, expect, test } from "bun:test";

import { briefCopyStatus, COPIED_STATUS, MANUAL_COPY_STATUS } from "../apps/docs/src/lib/clipboard";

describe("briefCopyStatus", () => {
  test("returns Copied. or manual fallback", () => {
    expect(briefCopyStatus("copied")).toBe(COPIED_STATUS);
    expect(briefCopyStatus("manual")).toBe(MANUAL_COPY_STATUS);
  });
});
