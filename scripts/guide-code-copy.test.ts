/**
 * Behavioral tests for guide fence copy controls.
 *
 * Drive the public attachment against a DOM fixture shaped like the HTML
 * emitted by scripts/llms-markdown.ts — not the module's internal helpers.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { MANUAL_COPY_STATUS } from "../apps/docs/src/lib/clipboard";
import { attachGuideCodeCopy, GUIDE_COPY_ICON_SVG } from "../apps/docs/src/lib/guide-code-copy";

/** Matches GUIDE_COPY_RESET_MS in guide-code-copy.ts (private). */
const GUIDE_COPY_RESET_MS = 2000;

type ClassList = {
  add(token: string): void;
  remove(token: string): void;
  has(token: string): boolean;
};

type FixtureButton = {
  dataset: { copyCode: string };
  innerHTML: string;
  ariaLabel: string;
  setAttribute(name: string, value: string): void;
  closest(sel: string): FixtureButton | null;
};

type FixtureStatus = {
  textContent: string;
  classList: ClassList;
};

type FixtureCode = { textContent: string };
type FixturePre = {
  querySelector(sel: string): FixtureCode | null;
};

type FixtureDoc = {
  querySelector(selector: string): FixturePre | FixtureStatus | null;
};

type FixtureRoot = {
  ownerDocument: FixtureDoc;
  contains(node: unknown): boolean;
  addEventListener(type: string, handler: (event: MouseEvent) => void): void;
  removeEventListener(type: string, handler: (event: MouseEvent) => void): void;
  dispatchClick(target: FixtureButton): void;
};

/**
 * Mount a single fence matching llms-markdown's `guide-code-copy` markup:
 * button[data-copy-code] + pre#id > code + #id-status status span.
 */
function mountGuideCodeFence(
  codeText: string,
  id = "guide-code-1",
): {
  root: FixtureRoot;
  button: FixtureButton;
  status: FixtureStatus;
  code: FixtureCode;
} {
  const code: FixtureCode = { textContent: codeText };
  const pre: FixturePre = {
    querySelector(sel: string) {
      return sel === "code" ? code : null;
    },
  };
  const statusClasses = new Set<string>(["visually-hidden"]);
  const status: FixtureStatus = {
    textContent: "",
    classList: {
      add(token: string) {
        statusClasses.add(token);
      },
      remove(token: string) {
        statusClasses.delete(token);
      },
      has(token: string) {
        return statusClasses.has(token);
      },
    },
  };
  const button: FixtureButton = {
    dataset: { copyCode: id },
    innerHTML: GUIDE_COPY_ICON_SVG,
    ariaLabel: "Copy code",
    setAttribute(name: string, value: string) {
      if (name === "aria-label") this.ariaLabel = value;
    },
    closest(sel: string) {
      return sel === "button[data-copy-code]" ? this : null;
    },
  };
  const doc: FixtureDoc = {
    querySelector(selector: string) {
      if (selector === `#${id}`) return pre;
      if (selector === `#${id}-status`) return status;
      return null;
    },
  };

  let clickHandler: ((event: MouseEvent) => void) | undefined;
  const root: FixtureRoot = {
    ownerDocument: doc,
    contains() {
      return true;
    },
    addEventListener(_type: string, handler: (event: MouseEvent) => void) {
      clickHandler = handler;
    },
    removeEventListener() {
      clickHandler = undefined;
    },
    dispatchClick(target: FixtureButton) {
      if (clickHandler === undefined) throw new Error("no click listener attached");
      clickHandler({ target } as unknown as MouseEvent);
    },
  };

  return { root, button, status, code };
}

type PendingTimer = { id: number; fn: () => void; ms: number };

function installTimerStubs(): {
  pending: PendingTimer[];
  restore: () => void;
} {
  const pending: PendingTimer[] = [];
  let nextId = 1;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;

  globalThis.setTimeout = ((fn: TimerHandler, ms?: number) => {
    const id = nextId++;
    pending.push({ id, fn: fn as () => void, ms: ms ?? 0 });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;

  globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
    const num = id as unknown as number;
    const idx = pending.findIndex((t) => t.id === num);
    if (idx >= 0) pending.splice(idx, 1);
  }) as unknown as typeof clearTimeout;

  return {
    pending,
    restore() {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    },
  };
}

function installClipboardStub(mode: "copied" | "manual"): {
  written: string[];
  restore: () => void;
} {
  const written: string[] = [];
  const previousNav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const previousWin = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDoc = Object.getOwnPropertyDescriptor(globalThis, "document");

  const clipboard = {
    writeText(text: string): Promise<void> {
      if (mode === "manual") return Promise.reject(new Error("clipboard denied"));
      written.push(text);
      return Promise.resolve();
    },
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard },
  });

  // selectText (manual path) touches window.getSelection + document.createRange.
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      getSelection: () => ({
        removeAllRanges() {},
        addRange() {},
      }),
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createRange: () => ({
        selectNodeContents() {},
      }),
    },
  });

  return {
    written,
    restore() {
      if (previousNav === undefined) Reflect.deleteProperty(globalThis, "navigator");
      else Object.defineProperty(globalThis, "navigator", previousNav);
      if (previousWin === undefined) Reflect.deleteProperty(globalThis, "window");
      else Object.defineProperty(globalThis, "window", previousWin);
      if (previousDoc === undefined) Reflect.deleteProperty(globalThis, "document");
      else Object.defineProperty(globalThis, "document", previousDoc);
    },
  };
}

/** Flush the fire-and-forget async click handler. */
async function flushClick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("attachGuideCodeCopy (DOM fixture)", () => {
  let timers: ReturnType<typeof installTimerStubs>;
  let clipboard: ReturnType<typeof installClipboardStub> | undefined;

  beforeEach(() => {
    timers = installTimerStubs();
  });

  afterEach(() => {
    timers.restore();
    clipboard?.restore();
    clipboard = undefined;
  });

  test("click Copy swaps to check feedback, then reverts after reset timer", async () => {
    clipboard = installClipboardStub("copied");
    const { root, button, status, code } = mountGuideCodeFence('{"field":"weight"}');
    const destroy = attachGuideCodeCopy(root as unknown as HTMLElement);

    root.dispatchClick(button);
    await flushClick();

    expect(clipboard.written).toEqual([code.textContent]);
    // Icon left the idle copy glyph (private check SVG is not exported).
    expect(button.innerHTML).not.toBe(GUIDE_COPY_ICON_SVG);
    expect(button.ariaLabel).toBe("Copied");
    expect(status.textContent).toBe("Copied.");
    expect(status.classList.has("visually-hidden")).toBe(true);
    expect(timers.pending).toHaveLength(1);
    expect(timers.pending[0]?.ms).toBe(GUIDE_COPY_RESET_MS);

    // Fire the reset timer — control returns to idle copy state.
    timers.pending[0]!.fn();
    expect(button.innerHTML).toBe(GUIDE_COPY_ICON_SVG);
    expect(button.ariaLabel).toBe("Copy code");
    expect(status.textContent).toBe("");
    expect(status.classList.has("visually-hidden")).toBe(true);

    destroy();
  });

  test("clipboard failure keeps copy icon and shows manual status (no reset timer)", async () => {
    clipboard = installClipboardStub("manual");
    const { root, button, status } = mountGuideCodeFence("npm install", "guide-code-2");
    attachGuideCodeCopy(root as unknown as HTMLElement);

    root.dispatchClick(button);
    await flushClick();

    expect(button.innerHTML).toBe(GUIDE_COPY_ICON_SVG);
    expect(button.ariaLabel).toBe("Copy code");
    expect(status.textContent).toBe(MANUAL_COPY_STATUS);
    expect(status.classList.has("visually-hidden")).toBe(false);
    expect(timers.pending).toEqual([]);
  });

  test("destroy clears a pending reset timer so idle feedback never fires late", async () => {
    clipboard = installClipboardStub("copied");
    const { root, button, status } = mountGuideCodeFence("x = 1");
    const destroy = attachGuideCodeCopy(root as unknown as HTMLElement);

    root.dispatchClick(button);
    await flushClick();
    expect(button.ariaLabel).toBe("Copied");
    expect(timers.pending).toHaveLength(1);

    destroy();
    expect(timers.pending).toHaveLength(0);
    // Status remains at the post-copy state; destroy only cancels the timer.
    expect(status.textContent).toBe("Copied.");
  });
});
