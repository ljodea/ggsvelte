import { describe, expect, it } from "vitest";

import { runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import { coord_equal, coord_fixed, coordEqual, coordFixed } from "../../src/lib/index.js";
import SceneView from "../../src/lib/scene/SceneView.svelte";
import { render } from "../helpers/render.js";

const rows = [
  { x: 0, y: 0 },
  { x: 10, y: 10 },
];

describe("fixed-aspect scene", () => {
  it("re-exports camelCase and ggplot2 coordinate helpers from the Svelte package", () => {
    expect(coord_fixed).toBe(coordFixed);
    expect(coord_equal).toBe(coordEqual);
    expect(coordEqual).toBe(coordFixed);
    expect(coordFixed({ ratio: 2 })).toEqual({ type: "fixed", ratio: 2 });
  });

  it("renders the theme-owned allocation behind only the fitted data rectangle", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .coordFixed()
        .theme({ letterboxFill: "#123456" })
        .spec(),
      { width: 640, height: 400 },
    );
    const panel = model.scene.panels[0];
    if (panel === undefined) throw new Error("expected fixed-aspect panel");
    const { container } = render(SceneView, { scene: model.scene });
    const letterbox = container.querySelector("rect.gg-letterbox");
    const panelBackground = container.querySelector("rect.gg-panel-background");
    expect(letterbox).not.toBeNull();
    expect(letterbox?.getAttribute("x")).toBe(String(panel.allocation?.x));
    expect(letterbox?.getAttribute("width")).toBe(String(panel.allocation?.width));
    expect(letterbox?.getAttribute("fill")).toContain("#123456");
    expect(panelBackground?.getAttribute("width")).toBe(String(panel.width));
    expect(container.querySelectorAll("rect.gg-letterbox")).toHaveLength(1);
    model.dispose();
  });

  it("publishes the degraded state and suppresses minor grid furniture", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .scaleXContinuous({ minorBreaks: [2.5, 7.5] })
        .coordFixed({ ratio: 100 })
        .spec(),
      { width: 320, height: 240 },
    );
    const { container } = render(SceneView, { scene: model.scene });
    expect(container.querySelector<SVGSVGElement>("svg")?.dataset.ggLayout).toBe("degraded");
    expect(container.querySelector(".gg-grid-minor")).toBeNull();
    model.dispose();
  });
});
