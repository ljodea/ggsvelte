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
