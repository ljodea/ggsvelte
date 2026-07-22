/**
 * buildFrame bin default-bins advisory.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame } from "../../src/pipeline/frame.ts";
import { ColumnTable } from "../../src/table.ts";
import type { Advisory, PipelineWarning } from "../../src/pipeline/types.ts";

describe("buildFrame — bin default advisory", () => {
  it("emits bin-default-bins when bins are not configured", () => {
    const table = ColumnTable.fromRows(Array.from({ length: 40 }, (_, i) => ({ x: i, y: 1 })));
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "x" }, y: { stat: "count" } },
        stat: "bin",
      },
      0,
      table,
      warnings,
    );
    buildFrame(binding, table, warnings, advisories);
    expect(advisories.some((a) => a.code === "bin-default-bins")).toBe(true);
  });
});
