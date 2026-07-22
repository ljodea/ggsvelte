/**
 * Delegated copy controls for guide markdown fences (`data-copy-code`).
 * Icons are shared with scripts/llms-markdown.ts (single source).
 */
import { copyText, MANUAL_COPY_STATUS } from "./clipboard";

/** Phosphor Copy (regular) — must match static HTML from llms-markdown. */
export const GUIDE_COPY_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>';

/** Phosphor Check (bold) — client-only feedback after successful copy. */
export const GUIDE_CHECK_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>';

export const GUIDE_COPY_RESET_MS = 2000;

function cssEscapeIdent(value: string): string {
  if (typeof globalThis.CSS?.escape === "function") return globalThis.CSS.escape(value);
  // guide fence ids are `guide-code-N`; keep a conservative fallback for tests.
  return value.replaceAll(/[^a-zA-Z0-9_-]/gu, (ch) => `\\${ch}`);
}

export type GuideCopyFeedback = {
  readonly icon: "copy" | "check";
  readonly buttonAriaLabel: string;
  readonly statusText: string;
  readonly statusVisuallyHidden: boolean;
  readonly resetMs: number | null;
};

export function guideCopyFeedback(result: "copied" | "manual"): GuideCopyFeedback {
  if (result === "copied") {
    return {
      icon: "check",
      buttonAriaLabel: "Copied",
      statusText: "Copied.",
      statusVisuallyHidden: true,
      resetMs: GUIDE_COPY_RESET_MS,
    };
  }
  return {
    icon: "copy",
    buttonAriaLabel: "Copy code",
    statusText: MANUAL_COPY_STATUS,
    statusVisuallyHidden: false,
    resetMs: null,
  };
}

/** Idle control state after a successful-copy reset timer fires. */
export function guideCopyIdleFeedback(): GuideCopyFeedback {
  return {
    icon: "copy",
    buttonAriaLabel: "Copy code",
    statusText: "",
    statusVisuallyHidden: true,
    resetMs: null,
  };
}

export function guideCopyIconSvg(icon: "copy" | "check"): string {
  return icon === "check" ? GUIDE_CHECK_ICON_SVG : GUIDE_COPY_ICON_SVG;
}

export interface GuideCopyDomTargets {
  readonly button: {
    innerHTML: string;
    setAttribute(name: string, value: string): void;
  };
  readonly status: {
    textContent: string;
    classList: { add(token: string): void; remove(token: string): void };
  };
}

/** Apply pure feedback to the button/status nodes used by guide fences. */
export function applyGuideCopyFeedback(
  targets: GuideCopyDomTargets,
  feedback: GuideCopyFeedback,
): void {
  targets.button.innerHTML = guideCopyIconSvg(feedback.icon);
  targets.button.setAttribute("aria-label", feedback.buttonAriaLabel);
  targets.status.textContent = feedback.statusText;
  if (feedback.statusVisuallyHidden) targets.status.classList.add("visually-hidden");
  else targets.status.classList.remove("visually-hidden");
}

export type GuideCodeCopyDeps = {
  readonly copyText: (text: string, fallbackNode: Node) => Promise<"copied" | "manual">;
  readonly setTimeout: typeof setTimeout;
  readonly clearTimeout: typeof clearTimeout;
};

const defaultDeps: GuideCodeCopyDeps = {
  copyText,
  setTimeout,
  clearTimeout,
};

/**
 * Svelte 5 attachment: delegated click for `button[data-copy-code]` fences.
 * Returns a destroy function that clears pending reset timers.
 */
export function createGuideCodeCopyAttachment(
  deps: GuideCodeCopyDeps = defaultDeps,
): (node: HTMLElement) => () => void {
  return (node: HTMLElement) => {
    const resetTimers = new Map<string, ReturnType<typeof setTimeout>>();

    async function handleClick(event: MouseEvent): Promise<void> {
      const target = event.target;
      // Duck-type Element so unit tests can run without a browser DOM global.
      if (
        target === null ||
        typeof target !== "object" ||
        typeof (target as Element).closest !== "function"
      ) {
        return;
      }
      const button = (target as Element).closest<HTMLButtonElement>("button[data-copy-code]");
      if (button === null || !node.contains(button)) return;
      const codeId = button.dataset.copyCode;
      if (codeId === undefined) return;
      const doc = node.ownerDocument;
      const block = doc.querySelector(`#${cssEscapeIdent(codeId)}`);
      const code = block?.querySelector("code");
      const status = doc.querySelector(`#${cssEscapeIdent(`${codeId}-status`)}`);
      if (code === null || code === undefined || status === null) return;

      const previous = resetTimers.get(codeId);
      if (previous !== undefined) deps.clearTimeout(previous);

      const result = await deps.copyText(code.textContent ?? "", code);
      const feedback = guideCopyFeedback(result);
      applyGuideCopyFeedback({ button, status }, feedback);

      if (feedback.resetMs !== null) {
        resetTimers.set(
          codeId,
          deps.setTimeout(() => {
            applyGuideCopyFeedback({ button, status }, guideCopyIdleFeedback());
            resetTimers.delete(codeId);
          }, feedback.resetMs),
        );
      }
    }

    function onClick(event: MouseEvent): void {
      void handleClick(event);
    }

    node.addEventListener("click", onClick);
    return () => {
      node.removeEventListener("click", onClick);
      for (const timer of resetTimers.values()) deps.clearTimeout(timer);
      resetTimers.clear();
    };
  };
}

export const attachGuideCodeCopy = createGuideCodeCopyAttachment();
