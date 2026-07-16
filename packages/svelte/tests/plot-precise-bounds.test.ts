import { describe, expect, it } from "vitest";

import type { PositionScale } from "@ggsvelte/core";

import {
  boundsEditorInputForScale,
  semanticAxisFromBounds,
} from "../src/lib/plot-precise-bounds.js";

describe("precise plot bounds adapters", () => {
  it.each(["linear", "log", "time"] as const)(
    "builds ascending %s inputs while preserving reversed presentation",
    (type) => {
      const input = boundsEditorInputForScale({
        axis: "x",
        action: "select",
        scale: { type, domain: [1, 100] } as PositionScale,
        bounds: [90, 10],
        reversed: true,
      });
      expect(input).toMatchObject({
        axis: "x",
        action: "select",
        scale: type,
        bounds: [10, 90],
        reversed: true,
      });
    },
  );

  it("builds inclusive categorical inputs from band domains", () => {
    const input = boundsEditorInputForScale({
      axis: "y",
      action: "select",
      scale: { type: "band", domain: ["north", "south"], step: 0.5 } as PositionScale,
    });
    expect(input).toMatchObject({
      scale: "band",
      bounds: ["north", "south"],
      categories: [
        { value: "north", label: "north" },
        { value: "south", label: "south" },
      ],
    });
  });

  it("converts applied values into controller semantic axis domains", () => {
    expect(semanticAxisFromBounds("log", [100, 1])).toEqual({
      kind: "log",
      domain: [1, 100],
    });
    expect(semanticAxisFromBounds("band", ["south", "north"])).toEqual({
      kind: "band",
      values: ["south", "north"],
    });
  });
});
