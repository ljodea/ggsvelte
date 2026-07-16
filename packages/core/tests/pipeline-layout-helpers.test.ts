/**
 * Characterization tests for pipeline layout helpers: constants, formatters,
 * and dedupe/snapshot utilities re-exported from layout-helpers.
 */
import { describe, expect, it } from "bun:test";

import {
  AXIS_TITLE_BAND,
  CAPTION_BAND,
  LEGEND_EDGE_PAD,
  LEGEND_GAP,
  SUBTITLE_BAND,
  TITLE_BAND,
  axisTicks,
  dedupeAdvisories,
  dedupeWarnings,
  elementwiseMaxMargins,
  layoutDomain,
  makeAxisValueFormatter,
  scaleDomainSnapshot,
} from "../src/pipeline/layout-helpers.ts";
import type { Advisory, PipelineWarning } from "../src/pipeline/types.ts";
import type { PositionScale } from "../src/scales/train.ts";

describe("layout chrome constants", () => {
  it("keeps title/legend band sizes stable", () => {
    expect(TITLE_BAND).toBe(22);
    expect(SUBTITLE_BAND).toBe(16);
    expect(CAPTION_BAND).toBe(14);
    expect(AXIS_TITLE_BAND).toBe(18);
    expect(LEGEND_GAP).toBe(12);
    expect(LEGEND_EDGE_PAD).toBe(2);
  });
});

describe("dedupeWarnings / dedupeAdvisories", () => {
  it("dedupes warnings by code+message", () => {
    const list: PipelineWarning[] = [
      { code: "missing-values", message: "dropped 1 row" },
      { code: "missing-values", message: "dropped 1 row" },
      { code: "missing-values", message: "dropped 2 rows" },
    ];
    expect(dedupeWarnings(list)).toEqual([
      { code: "missing-values", message: "dropped 1 row" },
      { code: "missing-values", message: "dropped 2 rows" },
    ]);
  });

  it("dedupes advisories by code+path", () => {
    const list: Advisory[] = [
      {
        code: "canvas-auto",
        path: "layers.0",
        chosen: "canvas",
        howToOverride: "force-svg",
      },
      {
        code: "canvas-auto",
        path: "layers.0",
        chosen: "canvas (again)",
        howToOverride: "force-svg",
      },
      {
        code: "canvas-auto",
        path: "layers.1",
        chosen: "canvas",
        howToOverride: "force-svg",
      },
    ];
    expect(dedupeAdvisories(list)).toHaveLength(2);
    expect(dedupeAdvisories(list).map((a) => a.path)).toEqual(["layers.0", "layers.1"]);
  });
});

describe("elementwiseMaxMargins", () => {
  it("takes the max on each side", () => {
    expect(
      elementwiseMaxMargins(
        { top: 10, right: 5, bottom: 20, left: 8 },
        { top: 12, right: 4, bottom: 18, left: 10 },
      ),
    ).toEqual({ top: 12, right: 5, bottom: 20, left: 10 });
  });
});

describe("layoutDomain / scaleDomainSnapshot", () => {
  const linear: PositionScale = {
    type: "linear",
    domain: [0, 100],
    range: [0, 1],
    normalize: (v) => v / 100,
  };
  const band: PositionScale = {
    type: "band",
    domain: ["a", "b"],
    range: [0, 1],
    normalize: () => 0,
    bandwidth: 0.5,
  };

  it("projects continuous domains with optional breaks", () => {
    expect(layoutDomain(linear)).toEqual({ type: "linear", min: 0, max: 100 });
    expect(layoutDomain(linear, [0, 50, 100])).toEqual({
      type: "linear",
      min: 0,
      max: 100,
      breaks: [0, 50, 100],
    });
  });

  it("projects band domains as categories", () => {
    expect(layoutDomain(band)).toEqual({ type: "band", categories: ["a", "b"] });
  });

  it("freezes domain snapshots", () => {
    const snap = scaleDomainSnapshot(linear);
    expect(snap).toEqual([0, 100]);
    expect(Object.isFrozen(snap)).toBe(true);
  });
});

describe("makeAxisValueFormatter", () => {
  it("formats band values as strings and null as en-dash", () => {
    const band: PositionScale = {
      type: "band",
      domain: ["a"],
      range: [0, 1],
      normalize: () => 0,
      bandwidth: 0.5,
    };
    const fmt = makeAxisValueFormatter(band);
    expect(fmt("a")).toBe("a");
    expect(fmt(null)).toBe("–");
  });
});

describe("axisTicks", () => {
  it("projects continuous ticks from start of extent", () => {
    const scale: PositionScale = {
      type: "linear",
      domain: [0, 100],
      range: [0, 1],
      normalize: (v) => v / 100,
    };
    const ticks = axisTicks(
      scale,
      [
        { value: 0, label: "0", labeled: true },
        { value: 50, label: "50", labeled: true },
      ],
      200,
      false,
    );
    expect(ticks).toEqual([
      { pos: 0, label: "0" },
      { pos: 100, label: "50" },
    ]);
  });
});

describe("singlePanelMarginReserve", () => {
  it("reserves bottom/left for titles and right for legends", async () => {
    const { singlePanelMarginReserve } =
      await import("../src/pipeline/panel-layout-single-reserve.ts");
    expect(singlePanelMarginReserve("", "", 18, 0)).toEqual({});
    expect(singlePanelMarginReserve("x", "y", 18, 40)).toEqual({
      bottom: 18,
      left: 18,
      right: 40 + LEGEND_GAP + LEGEND_EDGE_PAD,
    });
  });
});
