/**
 * SceneView ARIA surface (role / aria-label / aria-hidden by mode).
 * Axis has no aria of its own — role/label live on the SVG root here.
 */
import { describe, expect, it } from "vitest";

import { sceneLabel, type Scene } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import SceneView from "../../src/lib/scene/SceneView.svelte";
import { modelFor } from "../helpers/model.js";
import { render } from "../helpers/render.js";

const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
];

function liveScene(): { scene: Scene; dispose: () => void } {
  const model = modelFor(
    gg(rows, aes({ x: "x", y: "y", color: "cls" }))
      .geomPoint()
      .labs({ title: "Plot title", caption: "Plot caption" })
      .spec(),
  );
  return {
    scene: model.scene,
    dispose() {
      model.dispose();
    },
  };
}

describe("SceneView ARIA surface", () => {
  it("full mode: role=img, aria-label from sceneLabel, no aria-hidden", () => {
    const { scene, dispose } = liveScene();
    const { container } = render(SceneView, { scene, mode: "full" });
    const svg = container.querySelector("svg.gg-plot");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe(sceneLabel(scene));
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
    expect(svg?.querySelector("title")?.textContent).toBe(sceneLabel(scene));
    dispose();
  });

  it("chrome-bottom mode: role=img with aria-label (sandwich bottom is the named surface)", () => {
    const { scene, dispose } = liveScene();
    const { container } = render(SceneView, { scene, mode: "chrome-bottom" });
    const svg = container.querySelector("svg.gg-plot");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe(sceneLabel(scene));
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
    expect(svg?.classList.contains("gg-svg-chrome-bottom")).toBe(true);
    dispose();
  });

  it("marks mode: role=presentation and aria-hidden (decorative mark slice)", () => {
    const { scene, dispose } = liveScene();
    const { container } = render(SceneView, { scene, mode: "marks" });
    const svg = container.querySelector("svg.gg-plot");
    expect(svg?.getAttribute("role")).toBe("presentation");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.hasAttribute("aria-label")).toBe(false);
    expect(svg?.querySelector("title")).toBeNull();
    expect(svg?.classList.contains("gg-svg-marks")).toBe(true);
    dispose();
  });

  it("chrome-top mode: role=presentation and aria-hidden (top chrome is decorative)", () => {
    const { scene, dispose } = liveScene();
    const { container } = render(SceneView, { scene, mode: "chrome-top" });
    const svg = container.querySelector("svg.gg-plot");
    expect(svg?.getAttribute("role")).toBe("presentation");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.hasAttribute("aria-label")).toBe(false);
    expect(svg?.classList.contains("gg-svg-chrome-top")).toBe(true);
    dispose();
  });

  it("renders caption text when scene.caption is non-empty (drawTop modes)", () => {
    const { scene, dispose } = liveScene();
    expect(scene.caption).toBe("Plot caption");
    const { container } = render(SceneView, { scene, mode: "full" });
    const caption = container.querySelector("text.gg-caption");
    expect(caption?.textContent).toBe("Plot caption");
    expect(caption?.getAttribute("text-anchor")).toBe("end");
    dispose();
  });
});
