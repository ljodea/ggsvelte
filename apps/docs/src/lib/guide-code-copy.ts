/**
 * Guide fenced-code copy UI: pure feedback policy + SVG icons shared with
 * the guide article attachment. Behavior-sensitive DOM wiring stays in the
 * route; this module is value-free for unit tests (#463).
 */
import { MANUAL_COPY_STATUS } from "./clipboard";

/** Phosphor Copy / Check (regular/bold) — must match scripts/llms-markdown.ts. */
export const GUIDE_COPY_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>';

export const GUIDE_CHECK_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>';

export type GuideCopyUiState = {
  readonly buttonHtml: string;
  readonly ariaLabel: string;
  readonly statusText: string;
  /** When true, status is screen-reader-only (`.visually-hidden`). */
  readonly statusVisuallyHidden: boolean;
};

/** Idle / post-timeout control chrome. */
export function guideCopyUiIdle(): GuideCopyUiState {
  return {
    buttonHtml: GUIDE_COPY_ICON_SVG,
    ariaLabel: "Copy code",
    statusText: "",
    statusVisuallyHidden: true,
  };
}

/**
 * Control chrome after a clipboard attempt.
 * - copied: brief check icon + hidden "Copied." live status
 * - manual: restore copy icon + visible instructions (clipboard blocked)
 */
export function guideCopyUiAfter(result: "copied" | "manual"): GuideCopyUiState {
  if (result === "copied") {
    return {
      buttonHtml: GUIDE_CHECK_ICON_SVG,
      ariaLabel: "Copied",
      statusText: "Copied.",
      statusVisuallyHidden: true,
    };
  }
  return {
    buttonHtml: GUIDE_COPY_ICON_SVG,
    ariaLabel: "Copy code",
    statusText: MANUAL_COPY_STATUS,
    statusVisuallyHidden: false,
  };
}

export function applyGuideCopyUi(
  button: HTMLButtonElement,
  status: Element,
  ui: GuideCopyUiState,
): void {
  button.innerHTML = ui.buttonHtml;
  button.setAttribute("aria-label", ui.ariaLabel);
  status.textContent = ui.statusText;
  if (ui.statusVisuallyHidden) status.classList.add("visually-hidden");
  else status.classList.remove("visually-hidden");
}
