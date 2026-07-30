/**
 * Pure composition-diagnostic collection (extracted from plot assembly).
 * Browser lane: CI coverage is browser-only (SSR vitest does not collect).
 * Expected values are independent of implementation structure (codes,
 * channels, emit order).
 */
import { describe, expect, it } from "vitest";

import {
  collectCompositionDiagnostics,
  compositionAdvisoryDedupKey,
} from "../../src/lib/diagnostics/composition.js";
import type { PlotLayerLike } from "../../src/lib/layers/types.js";

function scale(channel: string): PlotLayerLike {
  return { kind: "scale", value: { [channel]: { type: "discrete" } } };
}

function labs(keys: Record<string, string>): PlotLayerLike {
  return { kind: "labs", value: keys };
}

function guides(keys: Record<string, unknown>): PlotLayerLike {
  return { kind: "guides", value: keys };
}

function legend(keys: Record<string, unknown>): PlotLayerLike {
  return { kind: "legend", value: keys };
}

function coord(): PlotLayerLike {
  return { kind: "coord", value: "flip" };
}

function facet(): PlotLayerLike {
  return { kind: "facet", value: { rows: "g" } };
}

function theme(): PlotLayerLike {
  return { kind: "theme", value: "dark" };
}

function mark(): PlotLayerLike {
  return {
    kind: "mark",
    descriptor: { geom: "point" },
  };
}

describe("collectCompositionDiagnostics", () => {
  it("returns empty for no layers", () => {
    expect(collectCompositionDiagnostics([])).toEqual([]);
  });

  it("ignores mark layers", () => {
    expect(collectCompositionDiagnostics([mark(), mark()])).toEqual([]);
  });

  it("emits DUPLICATE_SCALE_CHANNEL once per colliding channel", () => {
    const list = collectCompositionDiagnostics([scale("color"), scale("color"), scale("fill")]);
    expect(list).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_SCALE_CHANNEL",
        channel: "color",
        kind: "scale",
        severity: "advisory",
      }),
    ]);
  });

  it("emits DUPLICATE_MERGE_KEY for labs/guides/legend collisions", () => {
    const list = collectCompositionDiagnostics([
      labs({ title: "A" }),
      labs({ title: "B", x: "X" }),
      guides({ color: {} }),
      guides({ color: {}, size: {} }),
      legend({ position: "right" }),
      legend({ position: "bottom" }),
    ]);
    expect(
      list.map((d) => [d.code, "kind" in d ? d.kind : null, "key" in d ? d.key : null]),
    ).toEqual([
      ["DUPLICATE_MERGE_KEY", "labs", "title"],
      ["DUPLICATE_MERGE_KEY", "guides", "color"],
      ["DUPLICATE_MERGE_KEY", "legend", "position"],
    ]);
  });

  it("emits DUPLICATE_PLOT_LAYER when two REPLACE children share a kind", () => {
    const list = collectCompositionDiagnostics([coord(), coord(), facet(), theme(), theme()]);
    expect(list.map((d) => [d.code, "kind" in d ? d.kind : null])).toEqual([
      ["DUPLICATE_PLOT_LAYER", "coord"],
      ["DUPLICATE_PLOT_LAYER", "theme"],
    ]);
  });

  it("emits scale channels, then merge-key families, then replace families (cross-family order)", () => {
    const list = collectCompositionDiagnostics([
      scale("color"),
      scale("color"),
      labs({ title: "A" }),
      labs({ title: "B" }),
      coord(),
      coord(),
    ]);
    expect(list.map((d) => d.code)).toEqual([
      "DUPLICATE_SCALE_CHANNEL",
      "DUPLICATE_MERGE_KEY",
      "DUPLICATE_PLOT_LAYER",
    ]);
  });
});

describe("compositionAdvisoryDedupKey", () => {
  it("keys scale by channel, merge-key by kind+key, replace by kind", () => {
    const [scaleDup] = collectCompositionDiagnostics([scale("color"), scale("color")]);
    const [mergeDup] = collectCompositionDiagnostics([labs({ title: "A" }), labs({ title: "B" })]);
    const [replaceDup] = collectCompositionDiagnostics([coord(), coord()]);
    expect(compositionAdvisoryDedupKey(scaleDup)).toBe("DUPLICATE_SCALE_CHANNEL:color");
    expect(compositionAdvisoryDedupKey(mergeDup)).toBe("DUPLICATE_MERGE_KEY:labs:title");
    expect(compositionAdvisoryDedupKey(replaceDup)).toBe("DUPLICATE_PLOT_LAYER:coord");
  });
});
