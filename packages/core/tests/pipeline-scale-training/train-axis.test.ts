/**
 * trainAxis and continuousDomainOf characterization.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { collectAxisInputs, trainAxis } from "../../src/pipeline/scale-training.ts";
import { continuousDomainOf } from "../../src/pipeline/scale-axis-domain.ts";
import { PipelineError } from "../../src/pipeline.ts";
import { ColumnTable } from "../../src/table.ts";
import type { Advisory } from "../../src/pipeline/types.ts";
import { pointFrame } from "./fixtures.ts";

describe("trainAxis", () => {
  it("infers linear for continuous point evidence", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const advisories: Advisory[] = [];
    const inputs = collectAxisInputs("x", [pointFrame(table)], undefined, advisories);
    const training = trainAxis("x", inputs, {});
    expect(training.scale.type).toBe("linear");
    expect(training.advisories.some((a) => a.code === "scale-type-inferred")).toBe(true);
  });

  it("honors explicit scale type without type-inferred advisory", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const inputs = collectAxisInputs("x", [pointFrame(table)], "linear", []);
    const training = trainAxis("x", inputs, { type: "linear" });
    expect(training.scale.type).toBe("linear");
    expect(training.advisories.some((a) => a.code === "scale-type-inferred")).toBe(false);
  });

  it("rejects invalid continuous domains with structured errors", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const inputs = collectAxisInputs("x", [pointFrame(table)], "linear", []);
    try {
      trainAxis("x", inputs, { type: "linear", domain: fromAny<[number, number]>([1]) });
      expect.unreachable("should throw");
    } catch (e) {
      expect((e as { code: string }).code).toBe("invalid-scale-domain");
    }
  });
});

describe("continuousDomainOf", () => {
  it("returns undefined when domain is omitted", () => {
    expect(continuousDomainOf(undefined, "x")).toBeUndefined();
    expect(continuousDomainOf({}, "y")).toBeUndefined();
  });

  it("parses [min, max] and swaps inverted pairs", () => {
    expect(continuousDomainOf({ domain: [0, 10] }, "x")).toEqual([0, 10]);
    expect(continuousDomainOf({ domain: [10, 0] }, "y")).toEqual([0, 10]);
  });

  it("throws invalid-scale-domain for wrong arity or non-finite values", () => {
    try {
      continuousDomainOf({ domain: fromAny<[number, number]>([1]) }, "x");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("invalid-scale-domain");
    }
    try {
      continuousDomainOf({ domain: ["nope", "still-nope"] }, "y");
      expect.unreachable("should throw");
    } catch (e) {
      expect((e as PipelineError).code).toBe("invalid-scale-domain");
    }
  });
});
