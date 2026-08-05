/**
 * buildSfCoordinatesFrame unit edges (#809): empty panel, all-dropped features,
 * drop warning, and style-column expand. Happy-path geometry lives in
 * pipeline-m2/geom-sf-text.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind-layer.ts";
import { buildSfCoordinatesFrame } from "../../src/pipeline/frame-stats-sf-coordinates.ts";
import type { PipelineWarning } from "../../src/pipeline/types.ts";
import { PipelineError } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";

function geo(g: object): string {
  return JSON.stringify(g);
}

function textBinding(table: ColumnTable, warnings: PipelineWarning[] = []) {
  return bindLayer(
    {
      geom: "sf_text",
      stat: "sf_coordinates",
      aes: { label: { field: "name" }, color: { field: "region" } },
    },
    0,
    table,
    warnings,
  );
}

describe("buildSfCoordinatesFrame", () => {
  it("returns an empty frame for zero-row tables", () => {
    const table = ColumnTable.fromColumns({
      geometry: [] as string[],
      name: [] as string[],
      region: [] as string[],
    });
    const warnings: PipelineWarning[] = [];
    const frame = buildSfCoordinatesFrame(textBinding(table), table, [], warnings);
    expect(frame.n).toBe(0);
    expect(frame.xNumeric!.length).toBe(0);
    expect(frame.yNumeric!.length).toBe(0);
    expect(frame.rowIndex.length).toBe(0);
    expect(warnings).toEqual([]);
  });

  it("throws sf-geometry-missing when the geometry column is absent", () => {
    const table = ColumnTable.fromColumns({ name: ["a"], region: ["east"] });
    expect(() =>
      buildSfCoordinatesFrame(
        bindLayer(
          { geom: "sf_text", stat: "sf_coordinates", aes: { label: { field: "name" } } },
          0,
          table,
          [],
        ),
        table,
        [],
        [],
      ),
    ).toThrow(
      expect.objectContaining({
        code: "sf-geometry-missing",
      } satisfies Partial<PipelineError>),
    );
  });

  it("drops empty GeometryCollection features with a warning and empty frame", () => {
    const table = ColumnTable.fromColumns({
      geometry: [geo({ type: "GeometryCollection", geometries: [] })],
      name: ["empty"],
      region: ["west"],
    });
    const warnings: PipelineWarning[] = [];
    const frame = buildSfCoordinatesFrame(textBinding(table), table, [0], warnings);
    expect(frame.n).toBe(0);
    expect(warnings).toEqual([
      expect.objectContaining({
        code: "sf-coordinates-dropped",
        message: expect.stringMatching(/dropped 1 feature/),
      }),
    ]);
  });

  it("expands MultiPoint parts and replicates style columns per part", () => {
    const table = ColumnTable.fromColumns({
      geometry: [
        geo({
          type: "MultiPoint",
          coordinates: [
            [1, 2],
            [3, 4],
          ],
        }),
      ],
      name: ["mp"],
      region: ["north"],
    });
    const warnings: PipelineWarning[] = [];
    const frame = buildSfCoordinatesFrame(textBinding(table), table, [7], warnings);
    expect(frame.n).toBe(2);
    expect([...frame.xNumeric!]).toEqual([1, 3]);
    expect([...frame.yNumeric!]).toEqual([2, 4]);
    expect(frame.groups).toEqual([7, 7]);
    expect([...frame.rowIndex]).toEqual([0, 0]);
    expect(frame.labelValues).toEqual(["mp", "mp"]);
    expect(frame.colorValues).toEqual(["north", "north"]);
    expect(warnings).toEqual([]);
  });

  it("keeps usable features while warning about siblings with no points", () => {
    const table = ColumnTable.fromColumns({
      geometry: [
        geo({ type: "Point", coordinates: [9, 8] }),
        geo({ type: "GeometryCollection", geometries: [] }),
      ],
      name: ["ok", "bad"],
      region: ["a", "b"],
    });
    const warnings: PipelineWarning[] = [];
    const frame = buildSfCoordinatesFrame(textBinding(table), table, [0, 1], warnings);
    expect(frame.n).toBe(1);
    expect([...frame.xNumeric!]).toEqual([9]);
    expect([...frame.yNumeric!]).toEqual([8]);
    expect(frame.labelValues).toEqual(["ok"]);
    expect(frame.colorValues).toEqual(["a"]);
    expect(warnings.some((w) => w.code === "sf-coordinates-dropped")).toBe(true);
  });
});
