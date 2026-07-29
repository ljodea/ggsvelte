/**
 * Single field-evidence pass for validate()/dataChecks (no double plot pivot).
 * Production: validate.ts + validate-data-checks.ts + validate-data-evidence.ts.
 */
import { afterEach, describe, expect, it, spyOn } from "bun:test";

import * as evidence from "../src/validate-data-evidence.ts";
import { dataChecks, DEFAULT_VALIDATE_LIMITS } from "../src/validate-data.ts";
import { validate } from "../src/validate.ts";

describe("tier 2 — single field-evidence pass", () => {
  const spies: Array<{ mockRestore: () => void }> = [];
  afterEach(() => {
    while (spies.length > 0) spies.pop()!.mockRestore();
  });

  it("validate resolves layer evidence once and never re-runs plot-only resolve", () => {
    const layerSpy = spyOn(evidence, "resolveLayerFieldEvidence");
    const fieldSpy = spyOn(evidence, "resolveFieldEvidence");
    spies.push(layerSpy, fieldSpy);

    const n = 500;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = Array.from({ length: n }, (_, i) => i * 2);
    const result = validate(
      {
        data: { columns: { x, y } },
        layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      { lint: true },
    );

    expect(result.ok).toBe(true);
    expect(layerSpy).toHaveBeenCalledTimes(1);
    expect(fieldSpy).toHaveBeenCalledTimes(0);
  });

  it("dataChecks with pre-resolved layer evidence does not call resolvers", () => {
    const pre = evidence.resolveLayerFieldEvidence(
      {
        data: { columns: { x: [1, 2], y: [3, 4] } },
        layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      {},
      DEFAULT_VALIDATE_LIMITS,
    );
    expect(pre.status).toBe("ok");

    const layerSpy = spyOn(evidence, "resolveLayerFieldEvidence").mockImplementation(() => {
      throw new Error("dataChecks must not re-resolve when preResolvedLayer is provided");
    });
    const fieldSpy = spyOn(evidence, "resolveFieldEvidence").mockImplementation(() => {
      throw new Error("dataChecks must not call plot-only resolveFieldEvidence");
    });
    spies.push(layerSpy, fieldSpy);

    const errors = dataChecks(
      {
        data: { columns: { x: [1, 2], y: [3, 4] } },
        layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      {},
      DEFAULT_VALIDATE_LIMITS,
      pre,
    );
    expect(errors).toEqual([]);
  });

  it("aggregate maxRows failure skips data-backed lint advisories", () => {
    // Plot alone is under the limit; plot + distinct layer table exceeds it.
    // Shared layer evidence is status "errors", so lint must not get plot values.
    const plotX = Array.from({ length: 3 }, (_, i) => i);
    const plotY = Array.from({ length: 3 }, (_, i) => i);
    const layerX = Array.from({ length: 3 }, (_, i) => i + 10);
    const layerY = Array.from({ length: 3 }, (_, i) => -(i + 1)); // negatives for stacked-area

    const result = validate(
      {
        data: { columns: { x: plotX, y: plotY } },
        layers: [
          {
            geom: "area",
            position: "stack",
            data: { columns: { x: layerX, y: layerY } },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      { lint: true, limits: { maxRows: 5 } },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "validation-limit")).toBe(true);
    // Without shared evidence, stacked-area-negative cannot fire on layer y.
    expect(result.advisories ?? []).toEqual([]);
  });

  it("layer-only inline data keeps plot-scoped lint without layer values", () => {
    const result = validate(
      {
        layers: [
          {
            geom: "area",
            position: "stack",
            data: {
              columns: {
                x: [1, 2, 3],
                y: [1, -2, 3],
              },
            },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      { lint: true },
    );
    // Layer-only data: plot evidence is null, so lint has no values for the
    // layer field (plot-scoped shared map). This matches prior plot-only lint
    // handoff; dataChecks still sees per-layer evidence for tier-2 errors.
    expect(result.ok).toBe(true);
    expect(result.advisories ?? []).toEqual([]);
  });

  it("plot-level under-limit data still shares evidence with lint", () => {
    const result = validate(
      {
        data: {
          columns: {
            x: [1, 2, 3],
            y: [1, -2, 3],
            cat: ["a", "b", "c"],
          },
        },
        layers: [
          {
            geom: "area",
            position: "stack",
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      { lint: true },
    );
    expect(result.ok).toBe(true);
    expect(result.advisories?.some((a) => a.code === "stacked-area-negative")).toBe(true);
  });
});
