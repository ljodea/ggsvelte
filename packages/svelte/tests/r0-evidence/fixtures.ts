/**
 * Shared R0 interaction evidence fixtures and pointer helpers.
 * Production-neutral; used only by r0-evidence/* suites.
 */
import { expect } from "vitest";

export const rows = [
  { id: "a", x: 1, y: 10, group: "one" },
  { id: "b", x: 2, y: 20, group: "two" },
  { id: "c", x: 3, y: 15, group: "one" },
];
export const size = { width: 480, height: 320 };

export function pointEvent(
  capture: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  y: number,
  pointerType = "mouse",
  pointerId = 1,
): PointerEvent {
  const rect = capture.getBoundingClientRect();
  const event = new PointerEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: rect.left + (x / size.width) * rect.width,
    clientY: rect.top + (y / size.height) * rect.height,
    pointerId,
    pointerType,
  });
  capture.dispatchEvent(event);
  return event;
}

export async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

export function tool(container: HTMLElement, label: string): HTMLButtonElement {
  return [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].find(
    (button) => button.textContent === label,
  )!;
}

export async function dragArea(
  container: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  label = "Select area",
): Promise<void> {
  await expect.poll(() => tool(container, label).disabled).toBe(false);
  tool(container, label).click();
  await expect.poll(() => tool(container, label).getAttribute("aria-pressed")).toBe("true");
  const capture = container.querySelector(".gg-capture")!;
  pointEvent(capture, "pointerdown", from.x, from.y);
  pointEvent(capture, "pointermove", to.x, to.y);
  pointEvent(capture, "pointerup", to.x, to.y);
}
