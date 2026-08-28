import { describe, expect, it } from "vitest";

import { assemblePortableSpec } from "../../src/lib/assembly/assemble.js";

describe("assemblePortableSpec", () => {
  const rows = [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ];

  it("returns normalize(spec) when an explicit spec is provided", () => {
    const assembled = assemblePortableSpec({
      spec: {
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
      },
      layers: [],
    });
    expect(assembled).not.toBeNull();
    expect(assembled!.layers).toHaveLength(1);
    expect(assembled!.layers[0].geom).toBe("point");
  });

  it("ignores sibling inputs when an explicit spec is provided", () => {
    const assembled = assemblePortableSpec({
      spec: {
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
        labs: { title: "from-spec" },
      },
      data: [{ x: 9, y: 9 }],
      aes: { x: "nope", y: "nope" },
      layers: [{ geom: "line", aes: { x: "x", y: "y" } }],
      labs: { title: "ignored" },
    });
    expect(assembled!.labs?.title).toBe("from-spec");
    expect(assembled!.layers).toHaveLength(1);
    expect(assembled!.layers[0].geom).toBe("point");
  });

  it("returns null when there are no layers", () => {
    expect(
      assemblePortableSpec({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [],
      }),
    ).toBeNull();
  });

  it("builds from data/aes/layers without a top-level spec", () => {
    const assembled = assemblePortableSpec({
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      theme: "light",
      labs: { title: "T" },
      a11y: "force-svg",
      scales: { x: { type: "linear" } },
      legend: { order: "stable-domain" },
      facet: { wrap: "g" },
      coord: "flip",
    });
    expect(assembled).not.toBeNull();
    expect(assembled!.labs?.title).toBe("T");
    expect(assembled!.a11y).toBe("force-svg");
    expect(assembled!.coord?.type).toBe("flip");
    expect(assembled!.facet).toBeDefined();
    expect(assembled!.scales?.x).toBeDefined();
    expect(assembled!.legend?.order).toBe("stable-domain");
  });

  it("canonicalizes Date authoring values and preserves temporal scale parser options", () => {
    const assembled = assemblePortableSpec({
      data: [
        { when: new Date("2024-01-01T00:00:00.000Z"), value: 1 },
        { when: new Date("2024-01-02T00:00:00.000Z"), value: 2 },
      ],
      aes: { x: "when", y: "value" },
      layers: [{ geom: "line" }],
      scales: {
        x: {
          type: "time",
          temporalKind: "date",
          parse: "iso",
          dateBreaks: "2 weeks",
          dateMinorBreaks: "1 day",
          dateLabels: "%e %b",
          locale: "en-GB",
          weekStart: "monday",
        },
      },
    });
    expect(assembled?.data).toEqual({
      values: [
        { when: "2024-01-01", value: 1 },
        { when: "2024-01-02", value: 2 },
      ],
    });
    expect(assembled?.scales?.x).toMatchObject({
      type: "time",
      temporalKind: "date",
      parse: "iso",
      dateBreaks: "2 weeks",
      dateMinorBreaks: "1 day",
      dateLabels: "%e %b",
      locale: "en-GB",
      weekStart: "monday",
    });
  });

  it("lets empty layers array win over hypothetical registry content", () => {
    // Caller converts registry → LayerInput[] before assemble; empty wins.
    expect(
      assemblePortableSpec({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [],
      }),
    ).toBeNull();
  });

  it("folds non-mark plotLayers after props; children win over props (D2)", () => {
    const assembled = assemblePortableSpec({
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      plotLayers: [
        {
          kind: "theme",
          get value() {
            return "dark" as const;
          },
        },
        {
          kind: "labs",
          get value() {
            return { title: "from-child" };
          },
        },
      ],
      labs: { title: "from-prop" },
      theme: "light",
    });
    expect(assembled).not.toBeNull();
    // Children-last: child theme/labs win over prop theme/labs.
    expect(assembled!.theme).toBe("dark");
    expect(assembled!.labs?.title).toBe("from-child");
  });

  it("spec prop wins over non-mark plotLayers (gate)", () => {
    const assembled = assemblePortableSpec({
      spec: {
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
        labs: { title: "from-spec" },
      },
      layers: [],
      plotLayers: [
        {
          kind: "labs",
          get value() {
            return { title: "from-child" };
          },
        },
      ],
    });
    expect(assembled!.labs?.title).toBe("from-spec");
  });

  it("empty mark layers returns null even with non-mark plotLayers (gate)", () => {
    expect(
      assemblePortableSpec({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [],
        plotLayers: [
          {
            kind: "theme",
            get value() {
              return "dark" as const;
            },
          },
        ],
      }),
    ).toBeNull();
  });

  it("snapshots row data so later mutation does not change the assembled spec", () => {
    const mutable = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    const assembled = assemblePortableSpec({
      data: mutable,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
    });
    expect(assembled).not.toBeNull();
    const first = mutable[0];
    expect(first).toBeDefined();
    first.x = 99;
    expect(assembled!.data).toEqual({
      values: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    });
  });

  it("materializes Date cells to portable ISO strings", () => {
    const day = new Date("2020-01-15T12:00:00.000Z");
    const assembled = assemblePortableSpec({
      data: [{ t: day, y: 1 }],
      aes: { x: "t", y: "y" },
      layers: [{ geom: "point" }],
    });
    expect(assembled).not.toBeNull();
    const values = (assembled!.data as { values: { t: string; y: number }[] }).values;
    const row = values[0];
    expect(row).toBeDefined();
    expect(typeof row.t).toBe("string");
    expect(row.t).toContain("2020-01-15");
  });

  it("snapshots per-layer data so later mutation does not leak into the layer", () => {
    const layerRows = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    const assembled = assemblePortableSpec({
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point", data: layerRows }],
    });
    expect(assembled).not.toBeNull();
    const first = layerRows[0];
    expect(first).toBeDefined();
    first.x = 99;
    expect(assembled!.layers[0]?.data).toEqual({
      values: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    });
    // Plot-level data stays absent when only layer data is supplied.
    expect(assembled!.data).toBeUndefined();
  });

  it("rebuilds each layer row once for snapshot plus once for portable materialize (#1327)", () => {
    // snapshotRows and portableRows each call Object.entries once per row.
    // A second snapshot in materializeAndNormalize would add another R entries.
    const layerRows = Array.from({ length: 20 }, (_, i) => ({ x: i, y: i }));
    let entries = 0;
    const original = Object.entries;
    Object.entries = ((value: object) => {
      entries += 1;
      return original(value);
    }) as typeof Object.entries;
    try {
      const assembled = assemblePortableSpec({
        aes: { x: "x", y: "y" },
        layers: [{ geom: "point", data: layerRows }],
      });
      expect(assembled).not.toBeNull();
      expect(assembled!.layers[0]?.data).toEqual({
        values: layerRows,
      });
    } finally {
      Object.entries = original;
    }
    // 20 snapshot + 20 portable materialize — not 40 snapshot + 20 portable.
    expect(entries).toBe(40);
  });

  it("materializes Date cells in per-layer data to portable ISO strings", () => {
    const day = new Date("2020-06-01T00:00:00.000Z");
    const assembled = assemblePortableSpec({
      aes: { x: "t", y: "y" },
      layers: [{ geom: "point", data: [{ t: day, y: 7 }] }],
    });
    expect(assembled).not.toBeNull();
    const layerData = assembled!.layers[0]?.data as { values: { t: string; y: number }[] };
    const row = layerData.values[0];
    expect(row).toBeDefined();
    expect(typeof row.t).toBe("string");
    expect(row.t).toContain("2020-06-01");
    expect(row.y).toBe(7);
  });
});
