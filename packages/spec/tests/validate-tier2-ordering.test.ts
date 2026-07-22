/**
 * Cross-stage tier-2 error ordering characterization (structure → facet → data).
 * Production: validate.ts orchestrator + structure/data modules.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

function errorsOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  const result = validate(input, options ?? {});
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

describe("tier 2 — cross-stage error ordering (characterization)", () => {
  // Locks layer-structural → facet → data order so extract refactors cannot
  // reorder pipeline stages without a deliberate test update.
  it("reports structural, then facet, then data errors in that order", () => {
    const errors = errorsOf({
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "point", aes: { x: { field: "xx" } } }],
      facet: { wrap: { field: "g" }, rows: { field: "h" } },
    });
    expect(errors.map((e) => ({ code: e.code, path: e.path }))).toEqual([
      { code: "missing-required-channel", path: "/layers/0/aes/y" },
      { code: "facet-form-ambiguous", path: "/facet" },
      { code: "unknown-field", path: "/layers/0/aes/x" },
    ]);
  });

  it("truncation sentinel stays last when the cap crosses stage boundaries", () => {
    const errors = errorsOf(
      {
        data: { values: [{ x: 1, y: 2 }] },
        layers: [{ geom: "point", aes: { x: { field: "xx" } } }],
        facet: { wrap: { field: "g" }, rows: { field: "h" } },
      },
      { limits: { maxDiagnostics: 2 } },
    );
    expect(errors.map((e) => e.code)).toEqual([
      "missing-required-channel",
      "facet-form-ambiguous",
      "validation-limit",
    ]);
    expect(errors.at(-1)?.path).toBe("");
  });

  it("evidence failure still reports structural errors first, then invalid-data-profile", () => {
    // Structural stages run before resolveFieldEvidence; a bad profile must
    // not erase earlier grammar diagnostics or reorder them after data errors.
    const errors = errorsOf(
      {
        layers: [{ geom: "point", aes: { x: { field: "xx" } } }],
        facet: { wrap: { field: "g" }, rows: { field: "h" } },
      },
      { profile: fromAny({ fields: [{ name: "a", type: "numeric" }] }) },
    );
    expect(errors.map((e) => e.code)).toEqual([
      "missing-required-channel",
      "facet-form-ambiguous",
      "invalid-data-profile",
    ]);
  });
});
