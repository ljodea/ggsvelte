import { describe, expect, it } from "bun:test";

import { createFacetPanelIdentity } from "../src/facet-identity.ts";
import { runPipeline } from "../src/pipeline.ts";

const size = { width: 640, height: 400 };

function wrapModel(values: ReadonlyArray<string | number>) {
  return runPipeline(
    {
      data: { values: values.map((g, index) => ({ g, x: index + 1, y: index + 1 })) },
      layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      facet: { wrap: { field: "g" } },
    },
    size,
  );
}

describe("canonical facet panel identity", () => {
  it("keeps string and numeric lookalikes in distinct typed panels", () => {
    const model = wrapModel(["1", 1]);

    expect(model.scene.panels).toHaveLength(2);
    expect(model.scene.panels.map((panel) => panel.identity.values[0]?.encodedValue)).toEqual([
      "@n:1",
      "1",
    ]);
    expect(new Set(model.scene.panels.map((panel) => panel.id)).size).toBe(2);
  });

  it("keeps positive and negative zero in distinct typed panels", () => {
    const model = wrapModel([0, -0]);

    expect(model.scene.panels).toHaveLength(2);
    expect(new Set(model.scene.panels.map((panel) => panel.id)).size).toBe(2);
    expect(
      model.scene.panels
        .map((panel) => panel.identity.values[0]?.encodedValue)
        .toSorted((left, right) => String(left).localeCompare(String(right))),
    ).toEqual(["@n:-0", "@n:0"]);
  });

  it("length-frames field and value components so separators cannot collide", () => {
    const first = createFacetPanelIdentity([{ role: "wrap", field: "a", value: "bc|d:e" }]);
    const second = createFacetPanelIdentity([{ role: "wrap", field: "ab", value: "c|d:e" }]);

    expect(first.key).not.toBe(second.key);
    expect(first.values).toEqual([{ role: "wrap", field: "a", encodedValue: "bc|d:e" }]);
  });

  it("is stable across row reorder and a panel disappearing then returning", () => {
    const initial = wrapModel(["north", "south", "north"]);
    const reordered = wrapModel(["south", "north", "north"]);
    const missing = wrapModel(["north"]);
    const returned = wrapModel(["south", "north"]);
    const keys = (model: ReturnType<typeof wrapModel>) =>
      new Map(
        model.scene.panels.map((panel) => [panel.identity.values[0]?.encodedValue, panel.id]),
      );

    expect(keys(reordered)).toEqual(keys(initial));
    expect(keys(missing).get("north")).toBe(keys(initial).get("north"));
    expect(keys(returned)).toEqual(keys(wrapModel(["north", "south"])));
    for (const panel of returned.scene.panels) expect(panel.id).toBe(panel.identity.key);
  });
});
