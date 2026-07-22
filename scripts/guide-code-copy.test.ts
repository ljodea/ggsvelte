import { describe, expect, it } from "bun:test";

import {
  GUIDE_CHECK_ICON_SVG,
  GUIDE_COPY_ICON_SVG,
  guideCopyUiAfter,
  guideCopyUiIdle,
} from "../apps/docs/src/lib/guide-code-copy.ts";
import { MANUAL_COPY_STATUS } from "../apps/docs/src/lib/clipboard.ts";

describe("guide copy UI policy (#463)", () => {
  it("idle restores copy chrome with empty hidden status", () => {
    expect(guideCopyUiIdle()).toEqual({
      buttonHtml: GUIDE_COPY_ICON_SVG,
      ariaLabel: "Copy code",
      statusText: "",
      statusVisuallyHidden: true,
    });
  });

  it("copied shows check icon and hidden live status", () => {
    expect(guideCopyUiAfter("copied")).toEqual({
      buttonHtml: GUIDE_CHECK_ICON_SVG,
      ariaLabel: "Copied",
      statusText: "Copied.",
      statusVisuallyHidden: true,
    });
  });

  it("manual fallback keeps copy icon and visible instructions", () => {
    expect(guideCopyUiAfter("manual")).toEqual({
      buttonHtml: GUIDE_COPY_ICON_SVG,
      ariaLabel: "Copy code",
      statusText: MANUAL_COPY_STATUS,
      statusVisuallyHidden: false,
    });
  });
});
