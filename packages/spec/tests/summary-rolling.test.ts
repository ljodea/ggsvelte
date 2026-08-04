/**
 * summary_rolling stat — normalize / validate / builder surface.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("summary_rolling stat (spec)", () => {
  it("validate accepts a line layer with window + fun params", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
          ],
        },
        layers: [
          {
            geom: "line",
            stat: "summary_rolling",
            aes: { x: "x", y: "y" },
            params: { window: 30, fun: "median" },
          },
        ],
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("validate accepts summary_rolling on a point layer", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
          ],
        },
        layers: [
          {
            geom: "point",
            stat: "summary_rolling",
            aes: { x: "x", y: "y" },
            params: { window: 5 },
          },
        ],
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("requires params.window with a named-fix structural error", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
          ],
        },
        layers: [{ geom: "line", stat: "summary_rolling", aes: { x: "x", y: "y" } }],
      }),
      {},
    );
    const error = result.ok
      ? undefined
      : result.errors.find((e) => e.code === "summary-rolling-window-required");
    expect(error).toBeDefined();
    expect(error?.path).toBe("/layers/0/params/window");
  });

  it("rejects manual keep transforms as the summary fun with a named fix", () => {
    // first|last belong to stat manual's row-keep registry; on summary stats
    // they used to fall through applySummaryFun's default branch and silently
    // plot the window maximum.
    for (const fun of ["first", "last"]) {
      const result = validate(
        normalize({
          data: { values: [{ x: 1, y: 2 }] },
          layers: [
            {
              geom: "line",
              stat: "summary_rolling",
              aes: { x: "x", y: "y" },
              params: { window: 30, fun },
            },
          ],
        }),
        {},
      );
      const error = result.ok
        ? undefined
        : result.errors.find((e) => e.code === "summary-fun-unsupported");
      expect(error, `fun=${fun} must not validate`).toBeDefined();
      expect(error?.path).toBe("/layers/0/params/fun");
    }
  });

  it("rejects first/last for summary_bin the same way", () => {
    // (stat summary's own params union is already narrow — mean|median|sum —
    // so the leak exists only through the point/line params fun union, which
    // summary_bin and summary_rolling share with stat manual.)
    const result = validate(
      normalize({
        data: { values: [{ x: 1, y: 2 }] },
        layers: [
          {
            geom: "point",
            stat: "summary_bin",
            aes: { x: "x", y: "y" },
            params: { binwidth: 1, fun: "first" },
          },
        ],
      }),
      {},
    );
    const error = result.ok
      ? undefined
      : result.errors.find((e) => e.code === "summary-fun-unsupported");
    expect(error, "summary_bin fun first/last must not validate").toBeDefined();
  });

  it("accepts every registry summary fun", () => {
    for (const fun of ["mean", "median", "sum", "min", "max"]) {
      const result = validate(
        normalize({
          data: { values: [{ x: 1, y: 2 }] },
          layers: [
            {
              geom: "line",
              stat: "summary_rolling",
              aes: { x: "x", y: "y" },
              params: { window: 30, fun },
            },
          ],
        }),
        {},
      );
      expect(result.ok, `fun=${fun} should validate`).toBe(true);
    }
  });

  it("rejects a stat column on the y channel the runtime cannot map", () => {
    // The rolling summary is written as the frame y (a measure output); there
    // is no y-mappable {stat} column, mirroring summary_bin. Validation must
    // say so instead of letting the render throw unknown-stat-column.
    for (const stat of ["summary_rolling", "summary_bin"] as const) {
      const result = validate(
        normalize({
          data: { values: [{ x: 1, y: 2 }] },
          layers: [
            {
              geom: "line",
              stat,
              aes: { x: "x", y: { stat: "y" } },
              params: stat === "summary_rolling" ? { window: 30 } : { binwidth: 1 },
            },
          ],
        }),
        {},
      );
      const error = result.ok
        ? undefined
        : result.errors.find((e) => e.code === "unknown-stat-column");
      expect(error, `${stat} y={{stat:"y"}} must not validate`).toBeDefined();
      expect(error?.path).toBe("/layers/0/aes/y");
    }
  });

  it("still accepts y-mappable stat columns on the y channel (bin count)", () => {
    const result = validate(
      normalize({
        data: { values: [{ x: 1 }, { x: 2 }] },
        layers: [{ geom: "bar", stat: "bin", aes: { x: "x", y: { stat: "count" } } }],
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("accepts the rolling summary column on a style channel", () => {
    const result = validate(
      normalize({
        data: { values: [{ x: 1, y: 2 }] },
        layers: [
          {
            geom: "line",
            stat: "summary_rolling",
            aes: { x: "x", y: "y", color: { stat: "y" } },
            params: { window: 30 },
          },
        ],
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("builder geomLine({stat}) carries window/fun into params", () => {
    const built = gg({ x: [1, 2, 3], y: [1, 2, 3] }, aes({ x: "x", y: "y" }))
      .geomLine({ stat: "summary_rolling", window: 30, fun: "median" })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "line",
      stat: "summary_rolling",
      params: { window: 30, fun: "median" },
    });
  });

  it("builder geomPoint({stat}) accepts summary_rolling", () => {
    const built = gg({ x: [1, 2, 3], y: [1, 2, 3] }, aes({ x: "x", y: "y" }))
      .geomPoint({ stat: "summary_rolling", window: 30, fun: "median" })
      .spec();
    expect(built.layers[0]).toMatchObject({ geom: "point", stat: "summary_rolling" });
  });
});
