import { describe, expect, it } from "vitest";

import { trainBand, type PositionScale } from "@ggsvelte/core";

import {
  boundsEditorInputForScale,
  semanticAxisFromBounds,
} from "../src/lib/plot-precise-bounds.js";
import {
  consumeIntervalKeys,
  recomputePanelIntervalKeys,
} from "../src/lib/plot-interval-consumption.js";

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
      scale: {
        type: "band",
        domain: ["north", "south"],
        rawDomain: ["north", "south"],
        step: 0.5,
      } as PositionScale,
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

  it("round-trips typed band categories through precise and cross-panel selection", () => {
    const date = new Date("2025-01-02T00:00:00.000Z");
    const scale = trainBand([[1, "1", true, false, null, date]]);
    const input = boundsEditorInputForScale({
      axis: "x",
      action: "select",
      scale,
    });

    expect(input).toMatchObject({
      scale: "band",
      bounds: [1, date],
      categories: [
        { value: 1, label: "1" },
        { value: "1", label: "1" },
        { value: true, label: "true" },
        { value: false, label: "false" },
        { value: null, label: "(null)" },
        { value: date, label: date.toISOString() },
      ],
    });
    expect(
      boundsEditorInputForScale({
        axis: "x",
        action: "select",
        scale,
        bounds: ["@n:1", "1"],
      }),
    ).toMatchObject({ bounds: [1, "1"] });
    expect(
      boundsEditorInputForScale({
        axis: "x",
        action: "select",
        scale,
        bounds: ["@null", `@d:${String(date.getTime())}`],
      }),
    ).toMatchObject({ bounds: [null, date] });
    if (input.scale !== "band") throw new Error("expected band bounds");

    const numericAxis = semanticAxisFromBounds("band", [
      input.categories[0]!.value,
      input.categories[0]!.value,
    ]);
    const candidates = [
      { panelId: "north", xValue: 1, keys: ["number"] },
      { panelId: "north", xValue: "1", keys: ["string"] },
      { panelId: "south", xValue: 1, keys: ["south-number"] },
      { panelId: "south", xValue: "1", keys: ["south-string"] },
    ];

    expect(
      recomputePanelIntervalKeys({
        panelId: "north",
        domains: { x: numericAxis },
        candidates,
      }),
    ).toEqual(["number"]);
    expect(
      consumeIntervalKeys({
        records: [
          {
            panelId: "north",
            preset: "cross-panel",
            domains: { x: numericAxis },
            keys: ["number"],
          },
        ],
        panels: [{ id: "north" }, { id: "south" }],
        candidates,
      }),
    ).toEqual(["number", "south-number"]);
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
    expect(semanticAxisFromBounds("band", [1, "1"])).toEqual({
      kind: "band",
      values: ["@n:1", "1"],
    });
  });
});
