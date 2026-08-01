/**
 * Characterization for packages/spec/src/builder-data.ts (authoring data
 * snapshot + portable ISO materialization).
 */
import { describe, expect, it } from "bun:test";

import { calendarDateFields, toAuthoringDataRef, toDataRef } from "../src/builder-data.ts";
import { aes, gg } from "../src/builder.ts";
import { layerFrom } from "../src/builder-core.ts";

const rows = [
  { x: 1, y: 2, cls: "a" },
  { x: 2, y: 3, cls: "b" },
];

describe("builder-data — authoring forms", () => {
  it("accepts rows, columns, and named DataRef through gg()", () => {
    expect(gg(rows).geomPoint().spec().data).toEqual({ values: rows });
    expect(
      gg({ x: [1, 2], y: [2, 3] })
        .geomPoint()
        .spec().data,
    ).toEqual({
      columns: { x: [1, 2], y: [2, 3] },
    });
    expect(gg({ name: "cars" }).geomPoint().spec().data).toEqual({ name: "cars" });
  });

  it("snapshots row Date cells so later mutation of the source does not leak", () => {
    const when = new Date("2024-06-15T12:00:00.000Z");
    const source = [{ when, value: 1 }];
    const authoring = toAuthoringDataRef(source);
    when.setUTCFullYear(1999);
    if (!("values" in authoring)) throw new Error("expected values form");
    const snapped = authoring.values[0]!.when;
    expect(snapped).toBeInstanceOf(Date);
    expect((snapped as Date).toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("materializes Date cells as full ISO unless the scale is calendar date", () => {
    const when = new Date("2024-06-15T12:00:00.000Z");
    const authoring = toAuthoringDataRef([{ when, value: 1 }]);
    const datetime = toDataRef(authoring, new Set());
    expect(datetime).toEqual({
      values: [{ when: "2024-06-15T12:00:00.000Z", value: 1 }],
    });
    const calendar = toDataRef(authoring, new Set(["when"]));
    expect(calendar).toEqual({
      values: [{ when: "2024-06-15", value: 1 }],
    });
  });

  it("calendarDateFields tracks plot and layer mappings on date scales", () => {
    const fields = calendarDateFields({
      aes: aes({ x: "when", y: "value" }),
      layers: [{ aes: aes({ color: "group" }) }],
      scales: {
        x: { type: "time", temporalKind: "date" },
        color: { type: "time", temporalKind: "date" },
      },
    });
    expect([...fields].toSorted()).toEqual(["group", "when"]);
  });
});

describe("builder geom sugar — single snapshot (#1280)", () => {
  it("layerFrom does not deep-copy layer data; layer() is the snapshot point", () => {
    const source = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    // Geom sugar is this.layer(layerFrom(...)). Snapshotting in both places
    // deep-copied every row twice; layerFrom must pass the caller's ref through.
    const assembled = layerFrom("point", { data: source });
    expect(assembled.data).toBe(source);
  });

  it("geom sugar still isolates caller mutation after the geom call", () => {
    const plotRows = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const layerRows = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ];
    const builder = gg(plotRows, aes({ x: "x", y: "y" })).geomPoint({ data: layerRows });
    // Mutate after the geom call — must not leak into .spec().
    layerRows[0]!.x = 999;
    layerRows.push({ x: 50, y: 60 });
    const spec = builder.spec();
    expect(spec.layers[0]!.data).toEqual({
      values: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
    });
  });

  it("geom sugar with layer data matches direct .layer() parity", () => {
    const layerRows = [
      { x: 1, y: 2, g: "a" },
      { x: 3, y: 4, g: "b" },
    ];
    const viaSugar = gg(rows, aes({ x: "x", y: "y" }))
      .geomPoint({ data: layerRows, alpha: 0.5 })
      .spec();
    const viaLayer = gg(rows, aes({ x: "x", y: "y" }))
      .layer({ geom: "point", data: layerRows, params: { alpha: 0.5 } })
      .spec();
    expect(viaSugar).toEqual(viaLayer);
  });
});
