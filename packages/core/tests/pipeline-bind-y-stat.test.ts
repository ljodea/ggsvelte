/**
 * resolveYChannel: field vs after_stat y mapping for bindLayer.
 */
import { describe, expect, it } from "bun:test";

import { resolveYChannel } from "../src/pipeline/bind-layer-y.ts";
import { PipelineError } from "../src/pipeline/types.ts";
import { ColumnTable } from "../src/table.ts";

const table = ColumnTable.fromRows([
  { x: 1, y: 10 },
  { x: 2, y: 20 },
]);

describe("resolveYChannel", () => {
  it("maps a data field onto yField", () => {
    const got = resolveYChannel({
      aes: { y: { field: "y" } },
      stat: "identity",
      index: 0,
      table,
      warnings: [],
    });
    expect(got).toEqual({ yField: "y", yStatColumn: null });
  });

  it("accepts after_stat columns the layer stat actually generates", () => {
    const got = resolveYChannel({
      aes: { y: { stat: "count" } },
      stat: "count",
      index: 1,
      table,
      warnings: [],
    });
    expect(got).toEqual({ yField: null, yStatColumn: "count" });
  });

  it("rejects after_stat y columns the layer stat does not generate", () => {
    expect(() =>
      resolveYChannel({
        aes: { y: { stat: "count" } },
        stat: "identity",
        index: 2,
        table,
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unknown-stat-column",
        path: "/layers/2/aes/y",
      } satisfies Partial<PipelineError>),
    );
  });

  it("names generated columns when rejecting a bad after_stat mapping", () => {
    try {
      resolveYChannel({
        aes: { y: { stat: "level" } },
        stat: "bin",
        index: 0,
        table,
        warnings: [],
      });
      expect.unreachable("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      const message = (error as PipelineError).message;
      expect(message).toMatch(/maps stat column "level"/);
      expect(message).toMatch(/stat \("bin"\)/);
      expect(message).toMatch(/generates:/);
    }
  });
});
