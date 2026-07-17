import { describe, expect, it, vi } from "vitest";

import CaptureSurface from "../../src/lib/surface/CaptureSurface.svelte";
import { render } from "../helpers/render.js";

describe("CaptureSurface", () => {
  it("renders group capture with plot-scoped aria-describedby", () => {
    const { container } = render(CaptureSurface, {
      plotId: "plot-a",
      activeTool: "inspect",
      ariaLabel: "Chart",
      onFocus: () => {},
      onBlur: () => {},
      onPointerMove: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
      onLostPointerCapture: () => {},
      onClick: () => {},
      onKeyDown: () => {},
      onDblClick: () => {},
    });
    const capture = container.querySelector(".gg-capture");
    expect(capture).not.toBeNull();
    expect(capture?.getAttribute("role")).toBe("group");
    expect(capture?.getAttribute("tabindex")).toBe("0");
    expect(capture?.getAttribute("aria-label")).toBe("Chart");
    expect(capture?.getAttribute("aria-describedby")).toBe("plot-a-description plot-a-active");
    expect(capture?.getAttribute("aria-controls")).toBeNull();
  });

  it("sets aria-controls when provided and area-tool class for brush tools", () => {
    const select = render(CaptureSurface, {
      plotId: "p",
      activeTool: "select-area",
      ariaLabel: "A",
      ariaControls: "p-tooltip",
      onFocus: () => {},
      onBlur: () => {},
      onPointerMove: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
      onLostPointerCapture: () => {},
      onClick: () => {},
      onKeyDown: () => {},
      onDblClick: () => {},
    });
    const el = select.container.querySelector(".gg-capture");
    expect(el?.getAttribute("aria-controls")).toBe("p-tooltip");
    expect(el?.classList.contains("gg-area-tool")).toBe(true);

    const inspect = render(CaptureSurface, {
      plotId: "p",
      activeTool: "inspect",
      ariaLabel: "A",
      onFocus: () => {},
      onBlur: () => {},
      onPointerMove: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
      onLostPointerCapture: () => {},
      onClick: () => {},
      onKeyDown: () => {},
      onDblClick: () => {},
    });
    expect(inspect.container.querySelector(".gg-capture")?.classList.contains("gg-area-tool")).toBe(
      false,
    );
  });

  it("applies absolute fill positioning and area-tool touch styles", () => {
    const { container } = render(CaptureSurface, {
      plotId: "p",
      activeTool: "zoom-area",
      ariaLabel: "A",
      onFocus: () => {},
      onBlur: () => {},
      onPointerMove: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
      onLostPointerCapture: () => {},
      onClick: () => {},
      onKeyDown: () => {},
      onDblClick: () => {},
    });
    const capture = container.querySelector(".gg-capture");
    expect(capture).not.toBeNull();
    const style = getComputedStyle(capture!);
    expect(style.position).toBe("absolute");
    expect(style.pointerEvents).toBe("auto");
    expect(style.touchAction).toBe("none");
    expect(style.cursor).toBe("crosshair");
  });

  it("forwards click and keydown to host handlers", () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const { container } = render(CaptureSurface, {
      plotId: "p",
      activeTool: "inspect",
      ariaLabel: "A",
      onFocus: () => {},
      onBlur: () => {},
      onPointerMove: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
      onLostPointerCapture: () => {},
      onClick,
      onKeyDown,
      onDblClick: () => {},
    });
    const capture = container.querySelector(".gg-capture")!;
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    capture.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("binds element for host focus restoration", () => {
    let element: HTMLDivElement | null = null;
    const { container } = render(CaptureSurface, {
      get element() {
        return element;
      },
      set element(v: HTMLDivElement | null) {
        element = v;
      },
      plotId: "p",
      activeTool: "inspect",
      ariaLabel: "A",
      onFocus: () => {},
      onBlur: () => {},
      onPointerMove: () => {},
      onPointerLeave: () => {},
      onPointerDown: () => {},
      onPointerUp: () => {},
      onPointerCancel: () => {},
      onLostPointerCapture: () => {},
      onClick: () => {},
      onKeyDown: () => {},
      onDblClick: () => {},
    });
    const capture = container.querySelector(".gg-capture");
    expect(element).toBeInstanceOf(HTMLDivElement);
    expect(element).toBe(capture);
  });
});
