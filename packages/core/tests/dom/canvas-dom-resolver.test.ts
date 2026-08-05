/**
 * cssColorResolver: theme var() peel + currentColor for canvas paint (#0006).
 * sizeCanvasForDpr / drawClippedToPanel live in canvas-barrel.test.ts.
 */
import { afterEach, describe, expect, it } from "bun:test";

import { cssColorResolver } from "../../src/dom/canvas-dom.ts";

describe("cssColorResolver", () => {
  const originalGetComputedStyle = globalThis.getComputedStyle;
  let propertyReads = 0;
  let colorReads = 0;
  let properties: Record<string, string> = {};
  let color = "rgb(1, 2, 3)";

  afterEach(() => {
    globalThis.getComputedStyle = originalGetComputedStyle;
    propertyReads = 0;
    colorReads = 0;
    properties = {};
    color = "rgb(1, 2, 3)";
  });

  /** getComputedStyle only receives the element; no real DOM needed under bun. */
  const host = {} as Element;

  function installStyle() {
    globalThis.getComputedStyle = (el: Element): CSSStyleDeclaration => {
      expect(el).toBe(host);
      const style = {
        getPropertyValue(name: string) {
          propertyReads += 1;
          return properties[name] ?? "";
        },
        get color() {
          colorReads += 1;
          return color;
        },
      };
      return style as unknown as CSSStyleDeclaration;
    };
  }

  it("resolves var(--token, fallback) from computed style", () => {
    installStyle();
    properties["--gg-ink"] = "  #111111  ";
    const resolve = cssColorResolver(host);
    expect(resolve("var(--gg-ink, black)")).toBe("#111111");
    expect(propertyReads).toBe(1);
  });

  it("uses the embedded fallback when the custom property is empty", () => {
    installStyle();
    properties["--gg-ink"] = "";
    const resolve = cssColorResolver(host);
    expect(resolve("var(--gg-ink, #abcdef)")).toBe("#abcdef");
  });

  it("maps currentColor to the computed color", () => {
    installStyle();
    color = "rgb(9, 8, 7)";
    const resolve = cssColorResolver(host);
    expect(resolve("currentColor")).toBe("rgb(9, 8, 7)");
    expect(colorReads).toBe(1);
  });

  it("caches resolved colors so style is not re-read for the same input", () => {
    installStyle();
    properties["--gg-accent"] = "#ff0000";
    const resolve = cssColorResolver(host);
    expect(resolve("var(--gg-accent, red)")).toBe("#ff0000");
    expect(resolve("var(--gg-accent, red)")).toBe("#ff0000");
    expect(propertyReads).toBe(1);

    expect(resolve("currentColor")).toBe("rgb(1, 2, 3)");
    expect(resolve("currentColor")).toBe("rgb(1, 2, 3)");
    expect(colorReads).toBe(1);
  });

  it("passes through solid colors without touching computed style", () => {
    installStyle();
    const resolve = cssColorResolver(host);
    expect(resolve("#c0ffee")).toBe("#c0ffee");
    expect(propertyReads).toBe(0);
    expect(colorReads).toBe(0);
  });

  it("falls through whitespace-only custom properties to currentColor fallbacks", () => {
    installStyle();
    // Real theme tokens often chain: var(--gg-ink, currentColor).
    properties["--gg-ink"] = "   ";
    color = "rgb(4, 5, 6)";
    const resolve = cssColorResolver(host);
    expect(resolve("var(--gg-ink, currentColor)")).toBe("rgb(4, 5, 6)");
    expect(propertyReads).toBe(1);
    expect(colorReads).toBe(1);
  });
});
