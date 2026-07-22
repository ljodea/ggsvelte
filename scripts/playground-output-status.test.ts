import { describe, expect, test } from "bun:test";

import { MANUAL_COPY_STATUS } from "../apps/docs/src/lib/clipboard";
import {
  PLAYGROUND_SVG_DOWNLOADED_STATUS,
  playgroundCopyStatus,
  playgroundSvgDownloadFailureStatus,
  playgroundSvgExportFailureStatus,
} from "../apps/docs/src/lib/playground-output-status";

describe("playgroundCopyStatus", () => {
  test("reports copied label and manual fallback", () => {
    expect(playgroundCopyStatus("Svelte", "copied")).toBe("Svelte output copied.");
    expect(playgroundCopyStatus("Builder", "manual")).toBe(MANUAL_COPY_STATUS);
  });
});

describe("playground SVG export status", () => {
  test("formats diagnostic failures with optional fix", () => {
    expect(
      playgroundSvgExportFailureStatus({
        source: "export",
        code: "svg-export-failed",
        path: "",
        message: "Could not serialize.",
        fix: "Retry after apply.",
      }),
    ).toBe("SVG export failed · export/svg-export-failed: Could not serialize. Retry after apply.");
    expect(
      playgroundSvgExportFailureStatus({
        source: "pipeline",
        code: "render-failed",
        path: "/layers",
        message: "Boom",
      }),
    ).toBe("SVG export failed · pipeline/render-failed: Boom ");
  });

  test("formats download failures and success constant", () => {
    expect(playgroundSvgDownloadFailureStatus(new Error("Denied"))).toBe(
      "SVG export failed · export/download-failed: Denied The chart and outputs were retained.",
    );
    expect(playgroundSvgDownloadFailureStatus("x")).toBe(
      "SVG export failed · export/download-failed: The browser refused the download. The chart and outputs were retained.",
    );
    expect(PLAYGROUND_SVG_DOWNLOADED_STATUS).toBe("SVG downloaded.");
  });
});
