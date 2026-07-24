/**
 * Orchestrator-level plot-layer suppression and gate semantics (#659 slice 1).
 * Uses a real GGPlot host so layers-prop + registerPlotLayer interact the way
 * product code will.
 */
import { describe, expect, it } from "vitest";

import type { PortableSpec } from "../../src/lib/index.js";
import PlotLayerHost from "../fixtures/PlotLayerHost.svelte";
import { render } from "../helpers/render.js";

const rows = [
  { x: 1, y: 2, g: "a" },
  { x: 2, y: 4, g: "b" },
];

describe("plotLayers via orchestrator", () => {
  it("layers prop suppresses mark children but non-mark plot layers still apply", async () => {
    // CRITICAL: layers={[…]} must not drop registered theme/labs/… children.
    let assembled: PortableSpec | null = null;
    render(PlotLayerHost, {
      data: rows,
      aes: { x: "x", y: "y" },
      // Prop mark list wins over the GeomPoint child.
      layers: [{ geom: "line" as const }],
      point: true,
      plotLayers: [{ kind: "theme" as const, value: "dark" as const }],
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await expect.poll(() => assembled !== null).toBe(true);
    expect(assembled!.layers).toHaveLength(1);
    expect(assembled!.layers[0].geom).toBe("line");
    expect(assembled!.theme).toBe("dark");
  });

  it("spec prop wins over non-mark children", async () => {
    let assembled: PortableSpec | null = null;
    render(PlotLayerHost, {
      spec: {
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
        labs: { title: "from-spec" },
      },
      plotLayers: [{ kind: "labs" as const, value: { title: "from-child" } }],
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await expect.poll(() => assembled !== null).toBe(true);
    expect(assembled!.labs?.title).toBe("from-spec");
  });

  it("layers=[] with non-mark children yields no plot (null assembly)", async () => {
    let onrenderFired = false;
    const { container } = render(PlotLayerHost, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [],
      plotLayers: [{ kind: "theme" as const, value: "dark" as const }],
      onrender: () => {
        onrenderFired = true;
      },
    });
    // No mark layers → assemble returns null → no svg scene.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(container.querySelector("svg")).toBeNull();
    // onrender must not fire with a real model for an empty plot.
    expect(onrenderFired).toBe(false);
  });

  it("non-mark children only (no marks) yields no plot", async () => {
    const { container } = render(PlotLayerHost, {
      data: rows,
      aes: { x: "x", y: "y" },
      // No point, no layers prop, only a theme child.
      plotLayers: [{ kind: "theme" as const, value: "dark" as const }],
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(container.querySelector("svg")).toBeNull();
  });

  it("registered labs reach the assembled spec with a mark child", async () => {
    let assembled: PortableSpec | null = null;
    render(PlotLayerHost, {
      data: rows,
      aes: { x: "x", y: "y" },
      point: true,
      plotLayers: [{ kind: "labs" as const, value: { title: "child-labs" } }],
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await expect.poll(() => assembled !== null).toBe(true);
    expect(assembled!.labs?.title).toBe("child-labs");
  });
});
