/**
 * Axis tick geometry + label anchors (no ARIA — that lives on SceneView).
 */
import { describe, expect, it } from "vitest";

import { aes, gg } from "@ggsvelte/spec";

import Axis from "../../src/lib/scene/Axis.svelte";
import { modelFor } from "../helpers/model.js";
import { render } from "../helpers/render.js";

const rows = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
  { x: 3, y: 15 },
];

describe("Axis", () => {
  it("places x ticks at tick.pos and anchors labels middle", () => {
    const model = modelFor(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
    );
    const panel = model.scene.panels[0];
    expect(panel).toBeDefined();
    if (panel === undefined) throw new Error("expected panel");
    expect(panel.axisX).not.toBeNull();
    const ticks = panel.axisX;
    expect(ticks).not.toBeNull();
    if (ticks === null) throw new Error("expected axisX ticks");
    const { container } = render(Axis, {
      ticks,
      orient: "x" as const,
      panel,
      theme: model.scene.theme,
    });

    const group = container.querySelector("g.gg-axis-x");
    expect(group).not.toBeNull();
    expect(group?.getAttribute("transform")).toBe(
      `translate(${panel.x},${panel.y + panel.height})`,
    );

    const tickGroups = [...container.querySelectorAll("g.gg-tick")];
    expect(tickGroups.length).toBe(ticks.length);
    for (let i = 0; i < ticks.length; i++) {
      const tick = ticks[i];
      expect(tick).toBeDefined();
      if (tick === undefined) throw new Error("expected tick");
      expect(tickGroups[i]?.getAttribute("transform")).toBe(`translate(${tick.pos},0)`);
      const label = tickGroups[i]?.querySelector("text");
      if (tick.label !== "") {
        expect(label?.getAttribute("text-anchor")).toBe("middle");
        expect(label?.textContent).toBe(tick.label);
      }
    }
    model.dispose();
  });

  it("places y ticks at tick.pos and anchors labels end", () => {
    const model = modelFor(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
    );
    const panel = model.scene.panels[0];
    expect(panel).toBeDefined();
    if (panel === undefined) throw new Error("expected panel");
    expect(panel.axisY).not.toBeNull();
    const ticks = panel.axisY;
    expect(ticks).not.toBeNull();
    if (ticks === null) throw new Error("expected axisY ticks");
    const { container } = render(Axis, {
      ticks,
      orient: "y" as const,
      panel,
      theme: model.scene.theme,
    });

    const group = container.querySelector("g.gg-axis-y");
    expect(group).not.toBeNull();
    expect(group?.getAttribute("transform")).toBe(`translate(${panel.x},${panel.y})`);

    const tickGroups = [...container.querySelectorAll("g.gg-tick")];
    expect(tickGroups.length).toBe(ticks.length);
    for (let i = 0; i < ticks.length; i++) {
      const tick = ticks[i];
      expect(tick).toBeDefined();
      if (tick === undefined) throw new Error("expected tick");
      expect(tickGroups[i]?.getAttribute("transform")).toBe(`translate(0,${tick.pos})`);
      const label = tickGroups[i]?.querySelector("text");
      if (tick.label !== "") {
        expect(label?.getAttribute("text-anchor")).toBe("end");
        expect(label?.textContent).toBe(tick.label);
      }
    }
    model.dispose();
  });

  it("omits label text when tick.label is empty (geometry-only tick)", () => {
    const model = modelFor(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
    );
    const panel = model.scene.panels[0];
    expect(panel).toBeDefined();
    if (panel === undefined) throw new Error("expected panel");
    const ticks = [
      { pos: 10, label: "" },
      { pos: 40, label: "mid" },
    ];
    const { container } = render(Axis, {
      ticks,
      orient: "x" as const,
      panel,
      theme: model.scene.theme,
    });
    const tickGroups = [...container.querySelectorAll("g.gg-tick")];
    expect(tickGroups).toHaveLength(2);
    expect(tickGroups[0]?.querySelector("text")).toBeNull();
    expect(tickGroups[1]?.querySelector("text")?.textContent).toBe("mid");
    model.dispose();
  });
});
