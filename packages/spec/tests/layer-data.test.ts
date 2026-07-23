/**
 * Per-layer DataRef (#589): schema acceptance, normalize preservation,
 * validation path contracts.
 */
import { describe, expect, it } from "bun:test";

import { gg, normalize, validate } from "../src/index.ts";

const obs = [
  { x: 1, y: 10, g: "a" },
  { x: 2, y: 20, g: "b" },
];
const bands = [
  { xmin: 0.5, xmax: 1.5, ymin: 0, ymax: 30 },
  { xmin: 1.5, xmax: 2.5, ymin: 0, ymax: 30 },
];

describe("layer data schema + normalize", () => {
  it("accepts optional data on every layer geom", () => {
    const geoms = [
      "point",
      "line",
      "col",
      "bar",
      "area",
      "ribbon",
      "rule",
      "text",
      "smooth",
      "boxplot",
      "density",
      "errorbar",
      "rect",
      "tile",
      "raster",
    ] as const;
    for (const geom of geoms) {
      const result = validate({
        layers: [
          {
            geom,
            data: { values: [{ x: 1, y: 2 }] },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      });
      if (!result.ok) {
        const dataErrors = result.errors.filter((e) => e.path.includes("/data"));
        expect(dataErrors, geom).toEqual([]);
      }
      expect(result.ok, geom).toBe(true);
    }
  });

  it("normalize preserves layer data and inherits plot aes", () => {
    const portable = normalize({
      aes: { x: "x", y: "y" },
      layers: [
        { geom: "point", data: { values: obs } },
        {
          geom: "rect",
          data: { values: bands },
          aes: { xmin: "xmin", xmax: "xmax", ymin: "ymin", ymax: "ymax", x: null, y: null },
        },
      ],
    });
    expect(portable.layers[0]!.data).toEqual({ values: obs });
    expect(portable.layers[1]!.data).toEqual({ values: bands });
    expect(portable.layers[0]!.aes).toEqual({ x: { field: "x" }, y: { field: "y" } });
  });

  it("normalize is idempotent with layer data", () => {
    const once = normalize({
      layers: [{ geom: "point", data: { columns: { x: [1], y: [2] } }, aes: { x: "x", y: "y" } }],
    });
    expect(normalize(once)).toEqual(once);
  });

  it("rejects bad layer data form at /layers/0/data", () => {
    const result = validate({
      layers: [
        {
          geom: "point",
          data: { values: [{ x: 1 }], columns: { x: [1] } } as never,
          aes: { x: { field: "x" } },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path.startsWith("/layers/0/data"))).toBe(true);
  });

  it("tier-2 unknown field suggests fields from the owning layer table", () => {
    const result = validate(
      {
        layers: [
          {
            geom: "point",
            data: { values: [{ displ: 1.8, hwy: 29 }] },
            aes: { x: { field: "displ" }, y: { field: "missing_col" } },
          },
          {
            geom: "rect",
            data: { values: [{ xmin: 0, xmax: 1, ymin: 0, ymax: 1 }] },
            aes: {
              xmin: { field: "xmin" },
              xmax: { field: "xmax" },
              ymin: { field: "ymin" },
              ymax: { field: "ymax" },
            },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.errors.find((e) => e.path === "/layers/0/aes/y");
    expect(err).toBeDefined();
    expect(err!.message).toContain("displ");
    expect(err!.message).toContain("hwy");
    expect(err!.message).not.toContain("xmin");
  });

  // #609 — scale checks must not last-wins-collapse same field names across layers.
  it("scale-type-mismatch still fires when a later numeric layer shares field name v", () => {
    const result = validate(
      {
        scales: { x: { type: "linear" } },
        layers: [
          {
            geom: "point",
            // strings first — last-wins union would hide this under the numeric layer.
            data: {
              values: [
                { v: "a", y: 1 },
                { v: "b", y: 2 },
              ],
            },
            aes: { x: { field: "v" }, y: { field: "y" } },
          },
          {
            geom: "point",
            data: {
              values: [
                { v: 1, y: 3 },
                { v: 2, y: 4 },
              ],
            },
            aes: { x: { field: "v" }, y: { field: "y" } },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const mismatch = result.errors.filter((e) => e.code === "scale-type-mismatch");
    expect(mismatch.length).toBeGreaterThanOrEqual(1);
    expect(mismatch.some((e) => e.message.includes("v"))).toBe(true);
  });
});

describe("layer data builder", () => {
  it("geom sugar accepts data and emits layer.data", () => {
    const spec = gg()
      .geomPoint({ data: obs, aes: { x: "x", y: "y" } })
      .geomRect({
        data: bands,
        aes: { xmin: "xmin", xmax: "xmax", ymin: "ymin", ymax: "ymax" },
      })
      .spec();
    expect(spec.layers[0]!.data).toEqual({ values: obs });
    expect(spec.layers[1]!.data).toEqual({ values: bands });
    expect(spec.data).toBeUndefined();
  });
});
