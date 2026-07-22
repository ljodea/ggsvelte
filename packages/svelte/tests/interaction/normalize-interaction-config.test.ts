/**
 * Characterization for normalizeInteractionConfig capability resolution.
 */
import { describe, expect, it } from "vitest";

import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  normalizeInteractionConfig,
} from "../../src/lib/interaction/interaction.js";

describe("interaction capability normalization", () => {
  it("keeps static plots inert and uses reviewed defaults when opted in", () => {
    expect(normalizeInteractionConfig({})).toMatchObject({
      interactive: false,
      inspect: null,
      select: null,
      zoom: null,
      legendFocus: null,
      initialTool: "inspect",
    });

    expect(normalizeInteractionConfig({ inspect: true })).toMatchObject({
      interactive: true,
      inspect: {
        mode: "auto",
        pin: true,
        contentMode: "informational",
      },
      initialTool: "inspect",
    });
  });

  it("keeps legend focus opt-in and enables previews by default", () => {
    expect(normalizeInteractionConfig({ legendFocus: true })).toMatchObject({
      interactive: true,
      legendFocus: { preview: true },
      availableTools: [],
      initialTool: "inspect",
    });

    expect(normalizeInteractionConfig({ legendFocus: { preview: false } })).toMatchObject({
      interactive: true,
      legendFocus: { preview: false },
    });

    const withoutKey = normalizeInteractionConfig({ legendFocus: true }, { hasKey: false });
    expect(withoutKey.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INTERACTION_LEGEND_REQUIRES_KEY",
        prop: "key",
      }),
    );
    expect(withoutKey.legendFocus).toBeNull();
    expect(withoutKey.interactive).toBe(false);
  });

  it("warns when coordinated interval presets have no stable key", () => {
    // Union combines stored record keys and cross-panel matches candidate
    // semantic keys — keyless rows silently select nothing beyond the
    // origin rectangle, so surface it like keyless point selection.
    for (const preset of ["union", "cross-panel"] as const) {
      const withoutKey = normalizeInteractionConfig(
        { select: { type: "interval", preset } },
        { hasKey: false },
      );
      expect(withoutKey.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY",
          prop: "key",
        }),
      );
    }
    const independent = normalizeInteractionConfig(
      { select: { type: "interval" } },
      { hasKey: false },
    );
    expect(
      independent.diagnostics.some(
        (diagnostic) => diagnostic.code === "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY",
      ),
    ).toBe(false);
    const keyed = normalizeInteractionConfig(
      { select: { type: "interval", preset: "union" } },
      { hasKey: true },
    );
    expect(keyed.diagnostics).toEqual([]);
  });

  it("starts interval capabilities in Inspect and never arms a drag implicitly", () => {
    const resolved = normalizeInteractionConfig({
      inspect: true,
      select: "interval",
      zoom: true,
    });
    expect(resolved.initialTool).toBe("inspect");
    expect(resolved.availableTools).toEqual(["inspect", "select-area", "zoom-area"]);
    expect(resolved.select).toMatchObject({ type: "interval", mode: "xy" });
    expect(resolved.zoom).toMatchObject({ mode: "xy", trigger: "brush" });
  });

  it("enables faceted interval selection and diagnoses only faceted brush zoom", () => {
    const resolved = normalizeInteractionConfig(
      { inspect: true, select: "interval", zoom: true },
      { faceted: true },
    );
    expect(resolved.inspect).not.toBeNull();
    expect(resolved.select).toMatchObject({ type: "interval", mode: "xy" });
    expect(resolved.zoom).toBeNull();
    expect(resolved.diagnostics[0]).toMatchObject({
      code: "INTERACTION_INTERVAL_FACET_UNSUPPORTED",
      severity: "warning",
      prop: "zoom",
    });
  });

  it("catalogues every emitted diagnostic", () => {
    const result = normalizeInteractionConfig(
      {
        select: { type: "interval", mode: "xy" },
        zoom: { mode: "xy", trigger: "brush" },
      },
      { faceted: true },
    );
    for (const diagnostic of result.diagnostics) {
      expect(INTERACTION_DIAGNOSTIC_CATALOG[diagnostic.code]).toBeDefined();
    }
  });

  it("keeps each catalog entry's code equal to its key (characterization)", () => {
    // Locks the catalog object shape so extract refactors cannot drift entry.code
    // away from the Record key (agents and docs look up by both).
    for (const [key, entry] of Object.entries(INTERACTION_DIAGNOSTIC_CATALOG)) {
      expect(entry.code).toBe(key);
    }
  });
});
