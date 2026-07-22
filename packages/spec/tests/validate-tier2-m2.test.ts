/**
 * Tier-2 M2 statistical layer grammar/data checks (snapshot-tested messages).
 * Production: validate-structure.ts + validate-data-checks.ts.
 */
import { describe, expect, it } from "bun:test";

import type { DataProfile } from "../src/validate-data.ts";
import { validate } from "../src/validate.ts";

function errorsOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  const result = validate(input, options ?? {});
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

function codesOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  return errorsOf(input, options).map((e) => e.code);
}

describe("tier 2 — M2 statistical layer (snapshot-tested messages)", () => {
  it("histogram y mapped to a field -> computed-y-mapped", () => {
    const errors = errorsOf({
      layers: [{ geom: "histogram", aes: { x: { field: "v" }, y: { field: "n" } } }],
    });
    expect(errors[0]!.code).toBe("computed-y-mapped");
    expect(errors[0]).toMatchSnapshot();
  });

  it("density y mapped to a field -> computed-y-mapped", () => {
    const errors = errorsOf({
      layers: [{ geom: "density", aes: { x: { field: "v" }, y: { field: "n" } } }],
    });
    expect(errors[0]!.code).toBe("computed-y-mapped");
    expect(errors[0]).toMatchSnapshot();
  });

  it("bin center + boundary -> bin-center-and-boundary", () => {
    const errors = errorsOf({
      layers: [
        {
          geom: "histogram",
          aes: { x: { field: "v" } },
          params: { binwidth: 1, center: 0, boundary: 0 },
        },
      ],
    });
    expect(errors[0]!.code).toBe("bin-center-and-boundary");
    expect(errors[0]).toMatchSnapshot();
  });

  it("errorbar identity without ymin/ymax -> missing-required-channel (both)", () => {
    const codes = codesOf({
      layers: [{ geom: "errorbar", aes: { x: { field: "g" } } }],
    });
    expect(codes).toEqual(["missing-required-channel", "missing-required-channel"]);
  });

  it("errorbar summary requires y instead", () => {
    const spec = {
      layers: [{ geom: "errorbar", stat: "summary", aes: { x: { field: "g" } } }],
    };
    const errors = errorsOf(spec);
    expect(errors[0]!.code).toBe("missing-required-channel");
    expect(errors[0]!.path).toBe("/layers/0/aes/y");
    expect(errors[0]).toMatchSnapshot();
  });

  it("smooth and boxplot require x and y", () => {
    expect(codesOf({ layers: [{ geom: "smooth" }] })).toEqual([
      "missing-required-channel",
      "missing-required-channel",
    ]);
    expect(codesOf({ layers: [{ geom: "boxplot" }] })).toEqual([
      "missing-required-channel",
      "missing-required-channel",
    ]);
  });

  it("smooth over nominal fields -> channel-type-mismatch (inline data)", () => {
    const errors = errorsOf({
      data: { columns: { c: ["a", "b"], v: [1, 2] } },
      layers: [{ geom: "smooth", aes: { x: { field: "c" }, y: { field: "v" } } }],
    });
    expect(errors[0]!.code).toBe("channel-type-mismatch");
    expect(errors[0]).toMatchSnapshot();
  });

  it("boxplot needs discrete x + quantitative y (inline data)", () => {
    const errors = errorsOf({
      data: { columns: { c: ["a", "b"], v: [1, 2] } },
      layers: [{ geom: "boxplot", aes: { x: { field: "v" }, y: { field: "c" } } }],
    });
    expect(errors.map((e) => e.code)).toEqual(["channel-type-mismatch", "channel-type-mismatch"]);
    expect(errors[0]).toMatchSnapshot();
  });

  it("bin over a nominal x -> channel-type-mismatch (DataProfile)", () => {
    const profile: DataProfile = { fields: [{ name: "c", type: "nominal" }] };
    const errors = errorsOf(
      { layers: [{ geom: "histogram", aes: { x: { field: "c" } } }] },
      { profile },
    );
    expect(errors[0]!.code).toBe("channel-type-mismatch");
  });

  it("{ stat } channels resolve against the grown STAT_COLUMNS contract", () => {
    const good = validate(
      {
        data: { columns: { v: [1, 2, 3] } },
        layers: [{ geom: "histogram", aes: { x: { field: "v" }, y: { stat: "ndensity" } } }],
      },
      {},
    );
    expect(good.ok).toBe(true);
    const bad = errorsOf({
      data: { columns: { v: [1, 2, 3] } },
      layers: [{ geom: "histogram", aes: { x: { field: "v" }, y: { stat: "widthh" } } }],
    });
    expect(bad[0]!.code).toBe("unknown-stat-column");
    expect(bad[0]!.allowed).toEqual(["count", "density", "ncount", "ndensity"]);
  });
});

/**
 * Characterization for dataChecks temporal decisions: multi-consumer field
 * reuse, auto+default evidence reuse (ambiguous/invalid/Date), and profile
 * paths that must NOT reuse evidence temporal (always null) when options differ.
 */
