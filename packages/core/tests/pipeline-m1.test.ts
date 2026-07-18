/**
 * M1 pipeline surface, end to end: col/bar/area/rule/text geoms, the scales
 * config surface (types, domains, zero forcing, breaks, labels), color/fill
 * legends (incl. the order option), theme wiring, and the failure policy.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";
import type { SpecInput } from "@ggsvelte/spec";

import { PipelineError, runPipeline } from "../src/pipeline.ts";
import { renderToSVGString } from "../src/render-svg.ts";
import type {
  GlyphsBatch,
  PathsBatch,
  RectsBatch,
  SceneDiscreteLegend,
  SegmentsBatch,
} from "../src/scene.ts";

const size = { width: 640, height: 400 };

const salesRows = [
  { city: "Berlin", kind: "web", sales: 30 },
  { city: "Berlin", kind: "store", sales: 20 },
  { city: "Oslo", kind: "web", sales: 10 },
  { city: "Oslo", kind: "store", sales: 25 },
];

describe("col geom (stacked by default)", () => {
  const spec = () =>
    gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" }))
      .geomCol()
      .spec();

  it("emits a rects batch with stacked heights and per-rect fills", () => {
    const model = runPipeline(spec(), size);
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(4);
    expect(batch.fills).toHaveLength(4);
    expect(new Set(batch.fills).size).toBe(2);
    // stacked: two rects per band share x and abut vertically. Row 0
    // (Berlin/web, first-seen group) stacks ON TOP (ggplot2 order): its
    // bottom edge equals the store rect's top edge.
    const x0 = batch.rects[0]!;
    const x4 = batch.rects[4]!;
    expect(x0).toBeCloseTo(x4, 4);
    const webBottom = batch.rects[1]! + batch.rects[3]!;
    const storeTop = batch.rects[5]!;
    expect(webBottom).toBeCloseTo(storeTop, 3);
  });

  it("forces zero on the y scale with an advisory", () => {
    const model = runPipeline(spec(), size);
    expect(model.scales.y.type).toBe("linear");
    if (model.scales.y.type !== "band") expect(model.scales.y.domain[0]).toBe(0);
    expect(model.advisories.some((a) => a.code === "zero-forced")).toBe(true);
  });

  it("explicit zero: false suppresses the forcing (bars still contribute their zero baseline)", () => {
    const noZero = gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" }))
      .geomCol({ position: "dodge" })
      .scales({ y: { zero: false, nice: false } })
      .spec();
    const model = runPipeline(noZero, size);
    expect(model.advisories.some((a) => a.code === "zero-forced")).toBe(false);
    // bar geometry itself grows from 0, so the trained domain still reaches it
    if (model.scales.y.type !== "band") expect(model.scales.y.domain[0]).toBe(0);

    // zero: true on a plain point layer extends the domain to 0
    const pointZero = runPipeline(
      gg(salesRows, aes({ x: "city", y: "sales" }))
        .geomPoint()
        .scales({ y: { zero: true, nice: false } })
        .spec(),
      size,
    );
    if (pointZero.scales.y.type !== "band") expect(pointZero.scales.y.domain[0]).toBe(0);
  });

  it("dodge places side-by-side rects (no vertical stacking)", () => {
    const model = runPipeline(
      gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" }))
        .geomCol({ position: "dodge" })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    // both Berlin rects start at the baseline (bottom edge = ymax pixel of 0)
    const bottom0 = batch.rects[1]! + batch.rects[3]!;
    const bottom4 = batch.rects[5]! + batch.rects[7]!;
    expect(bottom0).toBeCloseTo(bottom4, 3);
    expect(batch.rects[0]!).not.toBeCloseTo(batch.rects[4]!, 1);
  });

  it("fill position rescales each band to proportions (y domain [0,1])", () => {
    const model = runPipeline(
      gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" }))
        .geomCol({ position: "fill" })
        .spec(),
      size,
    );
    if (model.scales.y.type !== "band") expect(model.scales.y.domain).toEqual([0, 1]);
  });
});

describe("bar geom (count stat)", () => {
  const rows = [
    { cls: "a", g: "u" },
    { cls: "a", g: "v" },
    { cls: "b", g: "u" },
    { cls: "a", g: "u" },
  ];

  it("counts rows per x; y axis titled count", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "cls" }))
        .geomBar()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(2);
    // "a" has 3 rows, "b" 1: the first rect is 3x the height of the second
    expect(batch.rects[3]!).toBeCloseTo(3 * batch.rects[7]!, 3);
    expect(model.scene.axes.y.title).toBe("count");
  });

  it("stacks counts per fill group and sums weights when mapped", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "cls", fill: "g" }))
        .geomBar()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.rects.length / 4).toBe(3); // (a,u), (a,v), (b,u)
    expect(batch.fills).toHaveLength(3);

    const weighted = runPipeline(
      gg(
        rows.map((r, i) => ({ ...r, w: i + 1 })),
        aes({ x: "cls", weight: "w" }),
      )
        .geomBar()
        .spec(),
      size,
    );
    const wBatch = weighted.scene.batches[0] as RectsBatch;
    // a: 1+2+4 = 7, b: 3 -> heights 7:3
    expect(wBatch.rects[3]! / wBatch.rects[7]!).toBeCloseTo(7 / 3, 3);
  });

  it("rejects a data-mapped y with a structured error", () => {
    const spec: SpecInput = {
      data: { values: rows },
      aes: { x: "cls", y: "g" },
      layers: [{ geom: "bar" }],
    };
    try {
      runPipeline(spec, size);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as PipelineError).code).toBe("computed-y-mapped");
    }
  });
});

describe("area geom", () => {
  const series = [
    { t: 1, v: 3, s: "p" },
    { t: 2, v: 5, s: "p" },
    { t: 3, v: 4, s: "p" },
    { t: 1, v: 1, s: "q" },
    { t: 2, v: 2, s: "q" },
    { t: 3, v: 2, s: "q" },
  ];

  it("emits closed filled polygons, stacked per group", () => {
    const model = runPipeline(
      gg(series, aes({ x: "t", y: "v", fill: "s" }))
        .geomArea()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    expect(batch.closed).toBe(true);
    expect(batch.fills).toHaveLength(2);
    expect(batch.pathOffsets.length).toBe(3);
    // each polygon has 2n vertices (upper + lower edge)
    expect(batch.pathOffsets[1]! - batch.pathOffsets[0]!).toBe(6);
    // y domain stacks to at least 3+1=4 .. 5+2=7
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[0]).toBe(0); // zero forced
      expect(model.scales.y.domain[1]).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("rule geom — two honest forms", () => {
  const rows = [
    { x: 1, y: 10 },
    { x: 5, y: 30 },
  ];

  it("annotation form: fixed intercepts span the panel", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .geomRule({ yintercept: 20, xintercept: [2, 4] })
        .spec(),
      size,
    );
    const batch = model.scene.batches[1] as SegmentsBatch;
    expect(batch.kind).toBe("segments");
    expect(batch.segments.length / 4).toBe(3);
    expect(batch.rowIndex[0]).toBe(0xffffffff); // annotation rows have no source row
  });

  it("annotation intercepts train the scales", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .geomRule({ yintercept: 100 })
        .spec(),
      size,
    );
    if (model.scales.y.type !== "band")
      expect(model.scales.y.domain[1]).toBeGreaterThanOrEqual(100);
  });

  it("data-driven form: one vertical rule per row, color-mappable", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { pos: 2, k: "a" },
            { pos: 4, k: "b" },
          ],
        },
        layers: [{ geom: "rule", aes: { x: { field: "pos" }, color: { field: "k" } } }],
      },
      size,
    );
    const batch = model.scene.batches[0] as SegmentsBatch;
    expect(batch.segments.length / 4).toBe(2);
    expect(batch.strokes).toHaveLength(2);
    expect(batch.strokes![0]).not.toBe(batch.strokes![1]);
  });

  it("mixed forms / missing forms / both axes throw structured errors", () => {
    const expectCode = (spec: SpecInput, code: string) => {
      try {
        runPipeline(spec, size);
        throw new Error("should have thrown");
      } catch (e) {
        expect((e as PipelineError).code).toBe(code);
      }
    };
    const data = { values: rows };
    expectCode(
      { data, layers: [{ geom: "rule", aes: { x: { field: "x" } }, params: { yintercept: 1 } }] },
      "rule-form-ambiguous",
    );
    expectCode({ data, layers: [{ geom: "rule" }] }, "rule-form-missing");
    expectCode(
      { data, layers: [{ geom: "rule", aes: { x: { field: "x" }, y: { field: "y" } } }] },
      "rule-both-axes",
    );
  });
});

describe("text geom", () => {
  const rows = [
    { x: 1, y: 10, name: "alpha" },
    { x: 5, y: 30, name: "beta" },
  ];

  it("emits glyphs with anchor/size/dx/dy params", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y", label: "name" }))
        .geomText({ anchor: "start", size: 14, dx: 4, dy: -2 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as GlyphsBatch;
    expect(batch.kind).toBe("glyphs");
    expect(batch.texts).toEqual(["alpha", "beta"]);
    expect(batch.anchor).toBe("start");
    expect(batch.size).toBe(14);
  });

  it("requires a label channel", () => {
    try {
      runPipeline(
        gg(rows, aes({ x: "x", y: "y" }))
          .geomText()
          .spec(),
        size,
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as PipelineError).code).toBe("missing-channel");
    }
  });
});

describe("scales config surface", () => {
  const rows = [
    { t: "2026-01-05", v: 3 },
    { t: "2026-03-20", v: 700 },
  ];

  it("time x scale: calendar ticks with default multi-scale labels", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "t", y: "v" }))
        .geomPoint()
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time"); // inferred from ISO strings
    const labels = model.scene.axes.x.ticks.map((t) => t.label);
    expect(labels.length).toBeGreaterThan(1);
    // ~2.5-month span at this width -> ISO-Monday weekly ticks, "Mon dd" labels
    expect(labels).toContain("Feb 02");
  });

  it("labels format strings apply (time pattern + numeric format)", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "t", y: "v" }))
        .geomPoint()
        .scales({ x: { labels: "%Y-%m" }, y: { type: "log" } })
        .spec(),
      size,
    );
    expect(model.scene.axes.x.ticks.every((t) => /^\d{4}-\d{2}$/.test(t.label))).toBe(true);
    expect(model.scales.y.type).toBe("log");
    const yLabels = model.scene.axes.y.ticks.map((t) => t.label);
    expect(yLabels).toContain("10");
    expect(yLabels).toContain("100");
  });

  it("explicit breaks override tick derivation", () => {
    const model = runPipeline(
      gg(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .scales({ x: { breaks: [1, 4, 9] } })
        .spec(),
      size,
    );
    expect(model.scene.axes.x.ticks.map((t) => t.label)).toEqual(["1", "4", "9"]);
  });

  it("pinned band domains drop out-of-domain rows with a warning", () => {
    const model = runPipeline(
      gg(salesRows, aes({ x: "city", y: "sales" }))
        .geomCol()
        .scales({ x: { domain: ["Berlin"] } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.rects.length / 4).toBe(2); // Berlin keeps web+store; Oslo drops
    expect(model.warnings.some((w) => w.code === "removed-missing")).toBe(true);
  });

  it("log y with non-positive data warns and drops", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 0 },
          { x: 2, y: 10 },
          { x: 3, y: 100 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .scales({ y: { type: "log" } })
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "log-nonpositive")).toBe(true);
    expect(model.warnings.some((w) => w.code === "removed-missing")).toBe(true);
  });

  it("no scale-type advisory when the type is explicit", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "t", y: "v" }))
        .geomPoint()
        .scales({ x: { type: "time" }, y: { type: "linear" } })
        .spec(),
      size,
    );
    expect(model.advisories.some((a) => a.code === "scale-type-inferred")).toBe(false);
  });
});

describe("legends", () => {
  const spec = (order?: "stable-domain" | "present-first-seen" | "sorted") => {
    let b = gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" }))
      .geomCol()
      .labs({ fill: "Channel" });
    if (order) b = b.legend({ order });
    return b.spec();
  };

  it("a discrete fill legend is produced, titled, and placed right of the panel", () => {
    const model = runPipeline(spec(), size);
    expect(model.scene.legends).toHaveLength(1);
    const legend = model.scene.legends[0] as SceneDiscreteLegend;
    expect(legend.type).toBe("discrete");
    expect(legend.title).toBe("Channel");
    expect(legend.entries.map((e) => e.label)).toEqual(["web", "store"]);
    const panel = model.scene.panels[0]!;
    expect(legend.x).toBeGreaterThan(panel.x + panel.width);
    expect(legend.x + legend.width).toBeLessThanOrEqual(size.width);
  });

  it("legend.order reorders labels WITHOUT changing colors", () => {
    const stable = runPipeline(spec(), size);
    const sorted = runPipeline(spec("sorted"), size);
    const entriesOf = (m: typeof stable) =>
      new Map((m.scene.legends[0] as SceneDiscreteLegend).entries.map((e) => [e.label, e.color]));
    expect([...entriesOf(sorted).keys()]).toEqual(["store", "web"]);
    expect(entriesOf(sorted).get("web")).toBe(entriesOf(stable).get("web"));
    expect(entriesOf(sorted).get("store")).toBe(entriesOf(stable).get("store"));
  });

  it("keeps typed values with colliding labels as distinct, disambiguated entries", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1, g: 1 },
          { x: 2, y: 2, g: "1" },
        ],
        aes({ x: "x", y: "y", color: "g" }),
      )
        .geomPoint()
        .legend({ order: "present-first-seen" })
        .spec(),
      size,
    );
    const legend = model.scene.legends[0] as SceneDiscreteLegend;
    expect(legend.type).toBe("discrete");
    // The ordinal scale assigns 1 and "1" distinct colors; collapsing them
    // to one entry would make the second group impossible to identify (or
    // filter). Colliding presentation labels carry a typed qualifier.
    expect(legend.entries.map((e) => e.value)).toEqual([1, "1"]);
    expect(legend.entries.map((e) => e.label)).toEqual(["1 (number)", "1 (text)"]);
    expect(new Set(legend.entries.map((e) => e.color)).size).toBe(2);
  });

  it("no color mapping -> no legends, no reserved right margin beyond labels", () => {
    const model = runPipeline(
      gg(salesRows, aes({ x: "city", y: "sales" }))
        .geomCol()
        .spec(),
      size,
    );
    expect(model.scene.legends).toHaveLength(0);
  });
});

describe("scale stability through the spec config (pinned/suspend/restore)", () => {
  const spec = (colorConfig?: import("@ggsvelte/spec").ColorScaleSpec) => {
    let b = gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" })).geomCol();
    if (colorConfig) b = b.scales({ fill: colorConfig });
    return b.spec();
  };
  const fillOf = (model: ReturnType<typeof runPipeline>, value: string) => {
    const resolved = model.scales.fill;
    if (resolved?.kind !== "ordinal") throw new Error("expected ordinal fill scale");
    return resolved.scale.colorOf(value);
  };

  it("an explicit domain PINS assignments and SUSPENDS (not discards) stored state", () => {
    // 1. grow mode: web=palette[0], store=palette[1]
    const grown = runPipeline(spec(), size);
    const webColor = fillOf(grown, "web")!;
    const storeColor = fillOf(grown, "store")!;

    // 2. pin an explicit domain that REVERSES the order: colors follow the
    //    domain positions, and out-of-domain values map to unknown
    const pinned = runPipeline(spec({ domain: ["store", "web"] }), {
      ...size,
      prevScales: grown.scales.state,
    });
    expect(fillOf(pinned, "store")).toBe(webColor); // domain position 0
    expect(fillOf(pinned, "web")).toBe(storeColor);
    // stored assignments SUSPENDED, not discarded: state passes through
    expect(pinned.scales.state["fill"]).toEqual(grown.scales.state["fill"]);

    // 3. removing the explicit domain RESTORES the stored assignments
    const restored = runPipeline(spec(), { ...size, prevScales: pinned.scales.state });
    expect(fillOf(restored, "web")).toBe(webColor);
    expect(fillOf(restored, "store")).toBe(storeColor);
  });

  it("out-of-domain values warn and render the unknown color", () => {
    const model = runPipeline(spec({ domain: ["web"] }), size);
    expect(model.warnings.some((w) => w.code === "out-of-domain")).toBe(true);
    expect(fillOf(model, "store")).toBeUndefined();
  });

  it("onExhaust: 'error' throws a structured error beyond the palette", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      city: "X",
      kind: `k${i}`,
      sales: i + 1,
    }));
    const throwing = gg(many, aes({ x: "city", y: "sales", fill: "kind" }))
      .geomCol()
      .scales({ fill: { onExhaust: "error" } })
      .spec();
    try {
      runPipeline(throwing, size);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as PipelineError).code).toBe("palette-exhausted");
    }
    // default: cycle + one-time warning
    const cycling = runPipeline(
      gg(many, aes({ x: "city", y: "sales", fill: "kind" }))
        .geomCol()
        .spec(),
      size,
    );
    expect(cycling.warnings.some((w) => w.code === "palette-exhausted")).toBe(true);
  });

  it("domainMode 'data' opts into legacy rebuild-per-render", () => {
    const first = runPipeline(spec({ domainMode: "data" }), size);
    const webColor = fillOf(first, "web");
    // remove "web": in data mode "store" gets recolored to palette[0]
    const storeOnly = gg(
      salesRows.filter((r) => r.kind === "store"),
      aes({ x: "city", y: "sales", fill: "kind" }),
    )
      .geomCol()
      .scales({ fill: { domainMode: "data" } })
      .spec();
    const second = runPipeline(storeOnly, { ...size, prevScales: first.scales.state });
    expect(fillOf(second, "store")).toBe(webColor);
  });
});

describe("theme wiring", () => {
  it("scene carries resolved tokens; unmapped bars render the accent var", () => {
    const svg = renderToSVGString(
      gg(salesRows, aes({ x: "city", y: "sales" }))
        .geomCol()
        .theme("dark")
        .spec(),
      size,
    );
    expect(svg).toContain('class="gg-paper"');
    expect(svg).toContain("var(--gg-paper, #16181d)");
    expect(svg).toContain("var(--gg-accent, #7ea1f0)");
    expect(svg).toContain("var(--gg-ink, #e6e8eb)");
  });

  it("edition-2 default uses the hrbr-style paper and ink roles", () => {
    const svg = renderToSVGString(
      gg(salesRows, aes({ x: "city", y: "sales" }))
        .geomCol()
        .spec(),
      size,
    );
    expect(svg).toContain('class="gg-paper"');
    expect(svg).toContain("var(--gg-paper, #ffffff)");
    expect(svg).toContain("var(--gg-ink, #262626)");
    expect(svg).not.toContain("gg-axis-line");
  });

  it("edition-1 specs retain the legacy transparent currentColor theme", () => {
    const svg = renderToSVGString(
      {
        edition: 1,
        data: { values: salesRows },
        aes: { x: { field: "city" }, y: { field: "sales" } },
        layers: [{ geom: "col" }],
      },
      size,
    );
    expect(svg).not.toContain("gg-paper");
    expect(svg).toContain("var(--gg-ink, currentColor)");
  });

  it("unknown theme names throw a structured tier-1 error", () => {
    try {
      runPipeline(
        fromAny({
          data: { values: salesRows },
          theme: "darkk",
          layers: [{ geom: "point", aes: { x: { field: "city" }, y: { field: "sales" } } }],
        }),
        size,
      );
      throw new Error("should have thrown");
    } catch (e) {
      // the schema rejects it first (SpecValidationError) — which IS tier 1
      expect((e as Error).name).toMatch(/SpecValidationError|PipelineError/);
    }
  });
});

describe("failure policy", () => {
  it("empty data renders a frame + axes placeholder with a warning", () => {
    const model = runPipeline(
      {
        data: { values: [] },
        layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      size,
    );
    expect(model.scene.batches).toHaveLength(0);
    expect(model.scene.panels).toHaveLength(1);
    expect(model.warnings.some((w) => w.code === "empty-data")).toBe(true);
    const svg = renderToSVGString(
      {
        data: { values: [] },
        layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      size,
    );
    expect(svg).toContain("gg-axis-x");
  });

  it("an all-null mapped column is a structured error", () => {
    try {
      runPipeline(
        {
          data: {
            values: [
              { x: null, y: 1 },
              { x: null, y: 2 },
            ],
          },
          layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
        },
        size,
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as PipelineError).code).toBe("all-null-column");
    }
  });

  it("a layer with no drawable rows is skipped with a warning", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { x: 1, y: 5, z: null },
            { x: 2, y: 9, z: null },
          ],
        },
        layers: [
          { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
          { geom: "point", aes: { x: { field: "x" }, y: { field: "x" }, alpha: null } },
        ],
      },
      { ...size },
    );
    expect(model.scene.batches.length).toBeGreaterThan(0);
  });

  it("zero-variance domains render with padding, not a collapse", () => {
    const model = runPipeline(
      gg([{ x: 5, y: 5 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      size,
    );
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain[0]).toBeLessThan(5);
      expect(model.scales.x.domain[1]).toBeGreaterThan(5);
    }
  });
});

describe("determinism across the new geoms", () => {
  it("byte-identical stacked-bar + legend + rule + text render", () => {
    const spec = gg(salesRows, aes({ x: "city", y: "sales", fill: "kind" }))
      .geomCol()
      .geomRule({ yintercept: 40, aes: { fill: null } })
      .geomText({ aes: { label: "kind", fill: null }, size: 9 })
      .labs({ title: "Sales" })
      .theme("light")
      .spec();
    const a = renderToSVGString(spec, size);
    const b = renderToSVGString(spec, size);
    expect(a).toBe(b);
    expect(a).toContain("gg-rects");
    expect(a).toContain("gg-segments");
    expect(a).toContain("gg-glyphs");
    expect(a).toContain("gg-legend");
  });
});
