import { describe, expect, test } from "bun:test";

import { MANUAL_COPY_STATUS } from "../apps/docs/src/lib/clipboard";
import {
  applyGuideCopyFeedback,
  createGuideCodeCopyAttachment,
  GUIDE_CHECK_ICON_SVG,
  GUIDE_COPY_ICON_SVG,
  GUIDE_COPY_RESET_MS,
  guideCopyFeedback,
  guideCopyIdleFeedback,
  guideCopyIconSvg,
} from "../apps/docs/src/lib/guide-code-copy";

describe("guideCopyFeedback", () => {
  test("copied feedback shows check icon, hidden status, and reset timer", () => {
    expect(guideCopyFeedback("copied")).toEqual({
      icon: "check",
      buttonAriaLabel: "Copied",
      statusText: "Copied.",
      statusVisuallyHidden: true,
      resetMs: GUIDE_COPY_RESET_MS,
    });
    expect(guideCopyIconSvg("check")).toBe(GUIDE_CHECK_ICON_SVG);
  });

  test("manual feedback keeps copy icon and visible status", () => {
    expect(guideCopyFeedback("manual")).toEqual({
      icon: "copy",
      buttonAriaLabel: "Copy code",
      statusText: MANUAL_COPY_STATUS,
      statusVisuallyHidden: false,
      resetMs: null,
    });
    expect(guideCopyIconSvg("copy")).toBe(GUIDE_COPY_ICON_SVG);
  });

  test("idle feedback restores copy control after successful-copy reset", () => {
    expect(guideCopyIdleFeedback()).toEqual({
      icon: "copy",
      buttonAriaLabel: "Copy code",
      statusText: "",
      statusVisuallyHidden: true,
      resetMs: null,
    });
  });
});

describe("applyGuideCopyFeedback", () => {
  test("writes icon, aria-label, status text, and visually-hidden class", () => {
    const classes = new Set<string>();
    const button = {
      innerHTML: "",
      setAttribute(_name: string, value: string) {
        this.aria = value;
      },
      aria: "",
    };
    const status = {
      textContent: "",
      classList: {
        add(token: string) {
          classes.add(token);
        },
        remove(token: string) {
          classes.delete(token);
        },
      },
    };

    applyGuideCopyFeedback({ button, status }, guideCopyFeedback("copied"));
    expect(button.innerHTML).toBe(GUIDE_CHECK_ICON_SVG);
    expect(button.aria).toBe("Copied");
    expect(status.textContent).toBe("Copied.");
    expect(classes.has("visually-hidden")).toBe(true);

    applyGuideCopyFeedback({ button, status }, guideCopyFeedback("manual"));
    expect(button.innerHTML).toBe(GUIDE_COPY_ICON_SVG);
    expect(button.aria).toBe("Copy code");
    expect(status.textContent).toBe(MANUAL_COPY_STATUS);
    expect(classes.has("visually-hidden")).toBe(false);
  });
});

describe("createGuideCodeCopyAttachment", () => {
  test("copied path applies feedback, schedules reset, and destroy clears timer", async () => {
    const timers = new Map<number, () => void>();
    let nextId = 1;
    let cleared: number[] = [];
    const deps = {
      copyText: () => Promise.resolve("copied" as const),
      setTimeout: ((fn: () => void) => {
        const id = nextId++;
        timers.set(id, fn);
        return id as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeout: ((id: ReturnType<typeof setTimeout>) => {
        cleared.push(id as unknown as number);
        timers.delete(id as unknown as number);
      }) as typeof clearTimeout,
    };

    const doc = {
      querySelector(selector: string) {
        if (selector === "#guide-code-1") return pre;
        if (selector === "#guide-code-1-status") return status;
        return null;
      },
    };
    const code = { textContent: '{"field":"weight"}' };
    const pre = {
      querySelector(sel: string) {
        return sel === "code" ? code : null;
      },
    };
    const classes = new Set<string>(["visually-hidden"]);
    const status = {
      textContent: "",
      classList: {
        add(t: string) {
          classes.add(t);
        },
        remove(t: string) {
          classes.delete(t);
        },
      },
    };
    const button = {
      dataset: { copyCode: "guide-code-1" },
      innerHTML: GUIDE_COPY_ICON_SVG,
      setAttribute(_n: string, v: string) {
        this.aria = v;
      },
      aria: "Copy code",
      closest(sel: string) {
        return sel === "button[data-copy-code]" ? this : null;
      },
    };
    let clickHandler: ((event: MouseEvent) => void) | undefined;
    const node = {
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
    };

    const destroy = createGuideCodeCopyAttachment(deps)(node as unknown as HTMLElement);
    expect(clickHandler).toBeDefined();

    clickHandler!({
      target: button,
    } as unknown as MouseEvent);
    // Flush the fire-and-forget async handler.
    await Promise.resolve();
    await Promise.resolve();

    expect(button.innerHTML).toBe(GUIDE_CHECK_ICON_SVG);
    expect(button.aria).toBe("Copied");
    expect(status.textContent).toBe("Copied.");
    expect(classes.has("visually-hidden")).toBe(true);
    expect(timers.size).toBe(1);

    destroy();
    expect(cleared).toEqual([1]);
    expect(timers.size).toBe(0);
  });

  test("manual path leaves visible status and does not schedule reset", async () => {
    const scheduled: number[] = [];
    const deps = {
      copyText: () => Promise.resolve("manual" as const),
      setTimeout: ((_fn: () => void) => {
        scheduled.push(1);
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeout: () => {},
    };

    const code = { textContent: "npm install" };
    const pre = {
      querySelector(sel: string) {
        return sel === "code" ? code : null;
      },
    };
    const classes = new Set<string>(["visually-hidden"]);
    const status = {
      textContent: "",
      classList: {
        add(t: string) {
          classes.add(t);
        },
        remove(t: string) {
          classes.delete(t);
        },
      },
    };
    const button = {
      dataset: { copyCode: "guide-code-2" },
      innerHTML: GUIDE_COPY_ICON_SVG,
      setAttribute(_n: string, v: string) {
        this.aria = v;
      },
      aria: "Copy code",
      closest(sel: string) {
        return sel === "button[data-copy-code]" ? this : null;
      },
    };
    const doc = {
      querySelector(selector: string) {
        if (selector === "#guide-code-2") return pre;
        if (selector === "#guide-code-2-status") return status;
        return null;
      },
    };
    let clickHandler: ((event: MouseEvent) => void) | undefined;
    const node = {
      ownerDocument: doc,
      contains() {
        return true;
      },
      addEventListener(_type: string, handler: (event: MouseEvent) => void) {
        clickHandler = handler;
      },
      removeEventListener() {},
    };

    createGuideCodeCopyAttachment(deps)(node as unknown as HTMLElement);
    clickHandler!({ target: button } as unknown as MouseEvent);
    await Promise.resolve();
    await Promise.resolve();

    expect(button.innerHTML).toBe(GUIDE_COPY_ICON_SVG);
    expect(button.aria).toBe("Copy code");
    expect(status.textContent).toBe(MANUAL_COPY_STATUS);
    expect(classes.has("visually-hidden")).toBe(false);
    expect(scheduled).toEqual([]);
  });
});
