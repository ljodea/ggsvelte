import { MANUAL_COPY_STATUS } from "./clipboard";
import type { PlaygroundDiagnostic } from "./playground-state-types";

export const PLAYGROUND_SVG_DOWNLOADED_STATUS = "SVG downloaded.";

export function playgroundCopyStatus(label: string, result: "copied" | "manual"): string {
  return result === "copied" ? `${label} output copied.` : MANUAL_COPY_STATUS;
}

export function playgroundSvgExportFailureStatus(diagnostic: PlaygroundDiagnostic): string {
  return `SVG export failed · ${diagnostic.source}/${diagnostic.code}: ${diagnostic.message} ${diagnostic.fix ?? ""}`;
}

export function playgroundSvgDownloadFailureStatus(error: unknown): string {
  const detail = error instanceof Error ? error.message : "The browser refused the download.";
  return `SVG export failed · export/download-failed: ${detail} The chart and outputs were retained.`;
}
