import { describe, expect, it } from "vitest";

import QuickstartSsrFixture from "./fixtures/QuickstartSsrFixture.svelte";
import { render } from "./helpers/render.js";
import { until } from "./helpers/until.js";

describe("documented Quickstart", () => {
  it("waits in a collapsed container, then renders responsively with a stable accessible name", async () => {
    const { container } = render(QuickstartSsrFixture);
    container.style.width = "0px";

    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    await until(() => root.dataset.ggReady === "false");
    expect(root.querySelector("svg.gg-plot")?.getAttribute("width")).toBe("640");
    expect(root.querySelector("svg.gg-plot")?.getAttribute("height")).toBe("400");

    container.style.width = "420px";
    await until(() => root.dataset.ggReady === "true");
    expect(root.querySelector("svg.gg-plot")?.getAttribute("width")).toBe("420");
    expect(root.querySelector("svg.gg-plot")?.getAttribute("height")).toBe("400");
    expect(root.querySelector("svg.gg-plot")?.getAttribute("aria-label")).toBe(
      "Fuel economy decreases as vehicle weight increases",
    );
  });
});
