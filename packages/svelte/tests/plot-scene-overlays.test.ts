import { describe, expect, it } from "vitest";

import PlotSceneOverlays from "../src/lib/PlotSceneOverlays.svelte";
import { render } from "./helpers/render.js";

const anchors = [{ x: 10, y: 20 }];

describe("PlotSceneOverlays", () => {
  it("renders the interactive overlay when surfaceInteractive", () => {
    const { container } = render(PlotSceneOverlays, {
      width: 100,
      height: 80,
      interactive: true,
      surfaceInteractive: true,
      selectedAnchors: anchors,
      emphasizedAnchors: [],
    });
    const overlays = container.querySelectorAll(".gg-interaction-overlay");
    expect(overlays).toHaveLength(1);
  });

  it("renders the inert overlay when non-interactive with anchors", () => {
    const { container } = render(PlotSceneOverlays, {
      width: 100,
      height: 80,
      interactive: false,
      surfaceInteractive: false,
      selectedAnchors: anchors,
      emphasizedAnchors: [],
    });
    expect(container.querySelectorAll(".gg-interaction-overlay")).toHaveLength(1);
  });

  it("renders nothing when non-interactive with empty anchors", () => {
    const { container } = render(PlotSceneOverlays, {
      width: 100,
      height: 80,
      interactive: false,
      surfaceInteractive: false,
      selectedAnchors: [],
      emphasizedAnchors: [],
    });
    expect(container.querySelector(".gg-interaction-overlay")).toBeNull();
  });

  it("never mounts both overlays when surfaceInteractive even with inert-looking flags", () => {
    // Structural exclusivity: surface branch wins over inert eligibility.
    const { container } = render(PlotSceneOverlays, {
      width: 100,
      height: 80,
      interactive: false,
      surfaceInteractive: true,
      selectedAnchors: anchors,
      emphasizedAnchors: anchors,
    });
    expect(container.querySelectorAll(".gg-interaction-overlay")).toHaveLength(1);
  });
});
