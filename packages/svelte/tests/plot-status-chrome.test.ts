import { describe, expect, it } from "vitest";

import PlotStatusChrome from "../src/lib/PlotStatusChrome.svelte";
import { render } from "./helpers/render.js";

describe("PlotStatusChrome", () => {
  it("renders plot-scoped instruction ids only when showInstructions", () => {
    const off = render(PlotStatusChrome, {
      plotId: "plot-a",
      showInstructions: false,
      activeDatumLabel: "x 1",
    });
    expect(off.container.querySelector("#plot-a-description")).toBeNull();
    expect(off.container.querySelector("#plot-a-active")).toBeNull();

    const on = render(PlotStatusChrome, {
      plotId: "plot-a",
      showInstructions: true,
      activeDatumLabel: "x 1, y 2",
    });
    const description = on.container.querySelector("#plot-a-description");
    const active = on.container.querySelector("#plot-a-active");
    expect(description?.textContent).toContain("Use arrow keys to inspect data");
    expect(active?.textContent?.trim()).toBe("x 1, y 2");
  });

  it("keeps instruction ids unique across two plot instances", () => {
    const first = render(PlotStatusChrome, {
      plotId: "p1",
      showInstructions: true,
      activeDatumLabel: "a",
    });
    const second = render(PlotStatusChrome, {
      plotId: "p2",
      showInstructions: true,
      activeDatumLabel: "b",
    });
    expect(first.container.querySelector("#p1-description")).not.toBeNull();
    expect(first.container.querySelector("#p1-active")?.textContent?.trim()).toBe("a");
    expect(second.container.querySelector("#p2-description")).not.toBeNull();
    expect(second.container.querySelector("#p2-active")?.textContent?.trim()).toBe("b");
    expect(document.querySelectorAll("#p1-description").length).toBe(1);
    expect(document.querySelectorAll("#p2-description").length).toBe(1);
  });

  it("renders area instruction, live region, empty, and capability gates", () => {
    const empty = render(PlotStatusChrome, {
      plotId: "plot-b",
      showAreaInstruction: false,
      showLiveRegion: false,
      emptyPlot: false,
      capabilityStatus: null,
    });
    expect(empty.container.querySelector(".gg-area-instruction")).toBeNull();
    expect(empty.container.querySelector("#plot-b-live")).toBeNull();
    expect(empty.container.querySelector(".gg-empty-state")).toBeNull();
    expect(empty.container.querySelector(".gg-capability-status")).toBeNull();

    const full = render(PlotStatusChrome, {
      plotId: "plot-b",
      showAreaInstruction: true,
      showLiveRegion: true,
      liveText: "Zoom complete.",
      emptyPlot: true,
      capabilityStatus: "No inspectable marks",
    });
    expect(full.container.querySelector(".gg-area-instruction")?.textContent).toContain(
      "Choose opposite corner",
    );
    const live = full.container.querySelector("#plot-b-live");
    expect(live?.getAttribute("aria-live")).toBe("polite");
    expect(live?.getAttribute("aria-atomic")).toBe("true");
    expect(live?.textContent).toBe("Zoom complete.");
    expect(full.container.querySelector(".gg-empty-state")?.textContent).toBe("No data to display");
    expect(full.container.querySelector(".gg-capability-status")?.textContent).toBe(
      "No inspectable marks",
    );
  });

  it("can render live region without surface instructions (legend-only focus)", () => {
    const { container } = render(PlotStatusChrome, {
      plotId: "legend-only",
      showInstructions: false,
      showLiveRegion: true,
      liveText: "Web focused, 1 datum.",
    });
    expect(container.querySelector("#legend-only-description")).toBeNull();
    expect(container.querySelector("#legend-only-live")?.textContent).toBe("Web focused, 1 datum.");
  });

  it("includes component-scoped reduced-motion resets for chrome classes", () => {
    render(PlotStatusChrome, {
      plotId: "rm",
      showAreaInstruction: true,
      emptyPlot: true,
      capabilityStatus: "status",
    });
    const cssText = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText);
        } catch {
          return [] as string[];
        }
      })
      .join("\n");
    expect(cssText).toMatch(/prefers-reduced-motion:\s*reduce/i);
    expect(cssText).toMatch(/transition:\s*none/i);
    // CSSOM may serialize `animation: none` as expanded longhands / `auto`.
    expect(cssText).toMatch(/animation:\s*(none|auto)/i);
  });

  it("keeps muted chrome color free of the numeric theme alpha token (#161)", () => {
    render(PlotStatusChrome, {
      plotId: "muted-color",
      emptyPlot: true,
      capabilityStatus: "status",
    });
    const cssText = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText);
        } catch {
          return [] as string[];
        }
      })
      .join("\n");
    // --gg-theme-interactionMuted is a numeric alpha; invalid in color position.
    expect(cssText).toMatch(/color:\s*var\(--gg-interactionMuted,\s*currentColor\)/i);
    expect(cssText).not.toMatch(
      /color:\s*var\(\s*--gg-interactionMuted\s*,\s*var\(\s*--gg-theme-interactionMuted/i,
    );
  });
});
