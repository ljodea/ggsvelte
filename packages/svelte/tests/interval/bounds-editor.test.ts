import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";

import BoundsEditor from "../../src/lib/interval/BoundsEditor.svelte";
import type { PreciseBoundsApplyEvent } from "../../src/lib/interval/bounds-editor.js";
import { render } from "../helpers/render.js";

function write(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("<BoundsEditor>", () => {
  it("is an inline labelled fieldset with 44px controls", async () => {
    const { container } = render(BoundsEditor, {
      input: {
        axis: "x",
        action: "select",
        scale: "linear",
        transform: "identity",
        bounds: [2, 8],
      },
      onapply: vi.fn(),
    });
    await tick();
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector("fieldset")?.getAttribute("aria-label")).toBe(
      "Edit horizontal selection bounds",
    );
    expect(container.querySelector("label[for]")?.textContent).toContain("Lower bound");
    expect(document.activeElement).toBe(container.querySelector("input"));
    for (const control of container.querySelectorAll("input, button")) {
      expect(getComputedStyle(control).minHeight).toBe("44px");
    }
  });

  it("does not commit while typing, then Apply emits exactly once", async () => {
    const events: PreciseBoundsApplyEvent[] = [];
    const { container } = render(BoundsEditor, {
      input: { axis: "x", action: "zoom", scale: "linear", transform: "identity", bounds: [2, 8] },
      onapply: (event: PreciseBoundsApplyEvent) => events.push(event),
    });
    const [lower, upper] = [...container.querySelectorAll("input")];
    write(lower, "3");
    write(upper, "7");
    await tick();
    expect(events).toEqual([]);
    container.querySelector<HTMLButtonElement>("button[type=submit]")!.click();
    expect(events).toEqual([
      {
        source: "precise-bounds",
        inputSource: "keyboard",
        action: "zoom",
        axis: "x",
        scale: "linear",
        transform: "identity",
        bounds: [3, 7],
        reversed: false,
      },
    ]);
  });

  it("reports the physical input used to activate Apply", () => {
    const onapply = vi.fn();
    const { container } = render(BoundsEditor, {
      input: {
        axis: "x",
        action: "select",
        scale: "linear",
        transform: "identity",
        bounds: [1, 10],
      },
      onapply,
    });
    const apply = container.querySelector<HTMLButtonElement>("button[type=submit]")!;
    apply.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "touch",
      }),
    );
    apply.click();

    expect(onapply).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "precise-bounds",
        inputSource: "touch",
      }),
    );
  });

  it("resets an uncommitted draft when the parent supplies new bounds", async () => {
    const { container, rerender } = render(BoundsEditor, {
      input: { axis: "x", action: "zoom", scale: "linear", transform: "identity", bounds: [2, 8] },
      onapply: vi.fn(),
    });
    write(container.querySelector("input")!, "3");
    await rerender({
      input: {
        axis: "x",
        action: "zoom",
        scale: "linear",
        transform: "identity",
        bounds: [10, 20],
      },
    });
    expect(
      [...container.querySelectorAll<HTMLInputElement>("input")].map((field) => field.value),
    ).toEqual(["10", "20"]);
  });

  it("keeps invalid errors visible, marks the field, and focuses it", async () => {
    const onapply = vi.fn();
    const { container } = render(BoundsEditor, {
      input: { axis: "x", action: "zoom", scale: "linear", transform: "log10", bounds: [1, 10] },
      onapply,
    });
    const lower = container.querySelector<HTMLInputElement>("input")!;
    write(lower, "0");
    container.querySelector<HTMLButtonElement>("button[type=submit]")!.click();
    await tick();
    expect(onapply).not.toHaveBeenCalled();
    expect(lower.getAttribute("aria-invalid")).toBe("true");
    expect(lower.getAttribute("aria-describedby")).toBeTruthy();
    expect(container.querySelector("[role=alert]")?.textContent).toContain("greater than zero");
    expect(document.activeElement).toBe(lower);
  });

  it("Cancel and Escape discard drafts and restore focus", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const oncancel = vi.fn();
    const { container, unmount } = render(BoundsEditor, {
      input: { axis: "y", action: "select", scale: "linear", bounds: [2, 8] },
      onapply: vi.fn(),
      oncancel,
      returnFocus: trigger,
    });
    write(container.querySelector("input")!, "4");
    container.querySelector<HTMLButtonElement>("button[type=button]")!.click();
    await tick();
    expect(oncancel).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);

    unmount();
    const second = render(BoundsEditor, {
      input: { axis: "y", action: "select", scale: "linear", bounds: [2, 8] },
      onapply: vi.fn(),
      oncancel,
      returnFocus: trigger,
    });
    second.container
      .querySelector("fieldset")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(oncancel).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("uses native selects for inclusive categorical endpoints", () => {
    const onapply = vi.fn();
    const { container } = render(BoundsEditor, {
      input: {
        axis: "x",
        action: "select",
        scale: "band",
        bounds: ["north", "south"],
        categories: [
          { value: "north", label: "North" },
          { value: "south", label: "South" },
        ],
      },
      onapply,
    });
    expect(container.querySelectorAll("select")).toHaveLength(2);
    container.querySelector<HTMLButtonElement>("button[type=submit]")!.click();
    expect(onapply).toHaveBeenCalledWith(
      expect.objectContaining({ scale: "band", bounds: ["north", "south"] }),
    );
  });
});
