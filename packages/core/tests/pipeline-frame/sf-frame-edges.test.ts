/**
 * buildSfFrame edges not always hit via pipeline (empty panel, MultiLine expand,
 * invalid Multi* coords, no-drawable throw). Happy paths live in the
 * geom-sf-areas / geom-sf-holes / geom-sf-paths / geom-sf-pipeline siblings
 * under pipeline-m2.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind-layer.ts";
import { buildSfFrame } from "../../src/pipeline/frame-stats-sf.ts";
import { PipelineError } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";

function geo(g: object): string {
  return JSON.stringify(g);
}

function sfBinding(table: ColumnTable) {
  return bindLayer(
    {
      geom: "sf",
      stat: "sf",
      aes: { fill: { field: "region" } },
    },
    0,
    table,
    [],
  );
}

describe("buildSfFrame edges", () => {
  it("returns an empty polygon frame for zero-row tables", () => {
    const table = ColumnTable.fromColumns({
      geometry: [] as string[],
      region: [] as string[],
    });
    const frame = buildSfFrame(sfBinding(table), table, [], []);
    expect(frame.n).toBe(0);
    expect(frame.xNumeric!.length).toBe(0);
    expect(frame.sf?.kind).toBe("polygon");
  });

  it("expands MultiLineString into separate line groups", () => {
    const table = ColumnTable.fromColumns({
      geometry: [
        geo({
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
            [
              [2, 2],
              [3, 3],
            ],
          ],
        }),
      ],
      region: ["east"],
    });
    const frame = buildSfFrame(sfBinding(table), table, [0], []);
    expect(frame.n).toBe(4);
    expect(frame.sf?.kind).toBe("line");
    // Two groups (one per line part), two vertices each
    expect(new Set(frame.groups).size).toBe(2);
    expect(frame.fillValues).toEqual(["east", "east", "east", "east"]);
  });

  it("expands MultiPolygon parts and keeps fill style", () => {
    const table = ColumnTable.fromColumns({
      geometry: [
        geo({
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
            [
              [
                [2, 2],
                [3, 2],
                [3, 3],
                [2, 2],
              ],
            ],
          ],
        }),
      ],
      region: ["west"],
    });
    const frame = buildSfFrame(sfBinding(table), table, [0], []);
    expect(frame.n).toBeGreaterThan(0);
    expect(frame.sf?.kind).toBe("polygon");
    expect(frame.fillValues?.every((v) => v === "west")).toBe(true);
  });

  it("throws sf-geometry-invalid for a MultiLineString with non-array coordinates", () => {
    const table = ColumnTable.fromColumns({
      geometry: [geo({ type: "MultiLineString", coordinates: "bad" })],
      region: ["x"],
    });
    expect(() => buildSfFrame(sfBinding(table), table, [0], [])).toThrow(
      expect.objectContaining({ code: "sf-geometry-invalid" } satisfies Partial<PipelineError>),
    );
  });

  it("throws sf-geometry-invalid when MultiPoint has no finite positions", () => {
    const table = ColumnTable.fromColumns({
      geometry: [
        geo({
          type: "MultiPoint",
          coordinates: [
            [Number.NaN, 1],
            [2, Number.POSITIVE_INFINITY],
          ],
        }),
      ],
      region: ["x"],
    });
    try {
      buildSfFrame(sfBinding(table), table, [0], []);
      expect.unreachable("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).code).toBe("sf-geometry-invalid");
      expect((error as PipelineError).message).toMatch(/no drawable coordinates/i);
    }
  });

  it("throws sf-geometry-missing when the geometry column is absent", () => {
    const table = ColumnTable.fromColumns({ region: ["x"] });
    expect(() =>
      buildSfFrame(bindLayer({ geom: "sf", stat: "sf", aes: {} }, 0, table, []), table, [], []),
    ).toThrow(
      expect.objectContaining({ code: "sf-geometry-missing" } satisfies Partial<PipelineError>),
    );
  });
});
