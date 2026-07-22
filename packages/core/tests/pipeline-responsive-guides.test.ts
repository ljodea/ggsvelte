import { describe, expect, it } from "bun:test";

import {
  aes,
  gg,
  guideAxis,
  guideColorbar,
  guideLegend,
  guideNone,
  scaleColorContinuous,
  scaleColorDiscrete,
  scaleColorIdentity,
  scaleFillDiscrete,
  scaleShapeDiscrete,
  scaleSizeIdentity,
} from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.js";
import { renderToSVGString } from "../src/render-svg.js";
import type { SceneDiscreteLegend } from "../src/scene.js";

const rows = [
  { x: 1, y: 2, region: "North" },
  { x: 2, y: 4, region: "South" },
  { x: 3, y: 3, region: "North" },
];

function discrete(width: number, build: ReturnType<typeof gg>): SceneDiscreteLegend[] {
  return runPipeline(build.spec(), { width, height: 360 }).scene.legends.filter(
    (legend): legend is SceneDiscreteLegend => legend.type === "discrete",
  );
}

describe("responsive guide planning", () => {
  it("merges semantically equivalent discrete guides into composite keys", () => {
    const legends = discrete(
      720,
      gg(rows, aes({ x: "x", y: "y", color: "region", shape: "region" }))
        .geomPoint()
        .scales({ ...scaleColorDiscrete(), ...scaleShapeDiscrete() })
        .labs({ color: "Region", shape: "Region" }),
    );
    expect(legends).toHaveLength(1);
    expect(legends[0]?.aesthetics).toEqual(["color", "shape"]);
    expect(legends[0]?.entries.every((entry) => entry.shape !== undefined)).toBe(true);
  });

  it("keeps guides separate when strict title identity differs", () => {
    const legends = discrete(
      720,
      gg(rows, aes({ x: "x", y: "y", color: "region", shape: "region" }))
        .geomPoint()
        .scales({ ...scaleColorDiscrete(), ...scaleShapeDiscrete() })
        .labs({ color: "Color region", shape: "Shape region" }),
    );
    expect(legends).toHaveLength(2);
  });

  it("keeps guides separate when mapped color and fill palettes differ", () => {
    const legends = discrete(
      720,
      gg(rows, aes({ x: "x", y: "y", color: "region", fill: "region" }))
        .geomPoint()
        .scales({
          ...scaleColorDiscrete({ range: ["#ff0000", "#00ff00"] }),
          ...scaleFillDiscrete({ range: ["#0000ff", "#ffff00"] }),
        })
        .labs({ color: "Region", fill: "Region" }),
    );
    expect(legends).toHaveLength(2);
    expect(legends.map((legend) => legend.entries.map((entry) => entry.color))).toEqual([
      ["#ff0000", "#00ff00"],
      ["#0000ff", "#ffff00"],
    ]);
  });

  it("moves automatic guides below on narrow viewports and keeps 320px of panel when right", () => {
    const narrow = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .spec(),
      { width: 420, height: 360 },
    );
    expect(narrow.scene.legends[0]?.position).toBe("bottom");
    expect(narrow.scene.legends[0]?.direction).toBe("horizontal");
    expect(narrow.warnings.filter((warning) => warning.code === "guide-auto-bottom")).toHaveLength(
      1,
    );

    const wide = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .spec(),
      { width: 720, height: 360 },
    );
    expect(wide.scene.legends[0]?.position).toBe("right");
    expect(wide.scene.panels[0]?.width).toBeGreaterThanOrEqual(320);
  });

  it("applies axis title/tick/label presentation and axis suppression without changing scale plans", () => {
    const styled = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .guides({ x: guideAxis({ title: "Observation", showTicks: false, showLabels: false }) })
        .spec(),
      { width: 640, height: 360 },
    );
    expect(styled.scene.axes.x.title).toBe("Observation");
    expect(styled.scene.panels[0]?.axisX?.every((tick) => tick.showTick === false)).toBe(true);
    expect(styled.scene.panels[0]?.axisX?.every((tick) => tick.showLabel === false)).toBe(true);
    expect(styled.guidePlans.some((plan) => plan.type === "axis" && plan.aesthetic === "x")).toBe(
      true,
    );
    const hidden = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .guides({ x: guideNone() })
        .spec(),
      { width: 640, height: 360 },
    );
    expect(hidden.scene.panels[0]?.axisX).toBeNull();
    expect(hidden.scene.axes.x.title).toBe("");
  });

  it("preserves a scale-local band label mode when a top-level axis guide only adds appearance", () => {
    const categories = [
      { category: "A deliberately long northern category", y: 1 },
      { category: "A deliberately long southern category", y: 2 },
    ];
    const result = runPipeline(
      gg(categories, aes({ x: "category", y: "y" }))
        .geomPoint()
        .scales({ x: { type: "band", guide: { mode: "wrap", wrap: 3 } } })
        .guides({ x: guideAxis({ title: "Category" }) })
        .spec(),
      { width: 280, height: 300 },
    );
    const plan = result.guidePlans.find(
      (candidate) => candidate.type === "axis" && candidate.aesthetic === "x",
    );
    expect(plan?.type).toBe("axis");
    if (plan?.type !== "axis") return;
    expect(plan.bandLabelMode).toBe("wrapped");
    expect(plan.bandLabelAuthorPinned).toBe(true);
  });

  it("keeps rendered label offsets aligned when axis tick marks are hidden", () => {
    const spec = gg(rows, aes({ x: "x", y: "y" }))
      .geomPoint()
      .theme({ name: "light", ticksX: true, ticksY: true, tickLength: 8 })
      .guides({
        x: guideAxis({ showTicks: false, showLabels: true }),
        y: guideAxis({ showTicks: false, showLabels: true }),
      })
      .spec();
    const svg = renderToSVGString(spec, { width: 640, height: 360 });
    expect(svg).toMatch(/gg-axis-x[\s\S]*?<text y="3"/);
    expect(svg).toMatch(/gg-axis-y[\s\S]*?<text x="-3"/);
  });

  it("restores complete unwrapped axis labels when collision:preserve is explicit", () => {
    const categories = [
      { category: "A deliberately long northern category", y: 1 },
      { category: "A deliberately long southern category", y: 2 },
    ];
    const build = gg(categories, aes({ x: "category", y: "y" }))
      .geomPoint()
      .scales({ x: { type: "band" } });
    const automatic = runPipeline(build.spec(), { width: 280, height: 300 });
    const result = runPipeline(build.guides({ x: guideAxis({ collision: "preserve" }) }).spec(), {
      width: 280,
      height: 300,
    });
    expect(
      result.scene.axes.x.ticks.every(
        (tick) =>
          tick.label === tick.fullLabel && tick.lines === undefined && tick.angle === undefined,
      ),
    ).toBe(true);
    expect(result.scene.panels[0]!.x).toBeGreaterThan(automatic.scene.panels[0]!.x);
  });

  it("reclaims tick-label margins and diagnostics for hidden axes", () => {
    const categories = [
      { category: "A deliberately long northern category", y: 1 },
      { category: "A deliberately long southern category", y: 2 },
    ];
    const build = gg(categories, aes({ x: "category", y: "y" }))
      .geomPoint()
      .scales({ x: { type: "band" } });
    const visible = runPipeline(build.spec(), { width: 280, height: 300 });
    const hidden = runPipeline(build.guides({ x: guideNone() }).spec(), {
      width: 280,
      height: 300,
    });
    expect(hidden.scene.panels[0]!.height).toBeGreaterThan(visible.scene.panels[0]!.height);
    expect(hidden.warnings.filter((warning) => warning.code.startsWith("band-label"))).toEqual([]);
  });

  it("reserves independent right and bottom zones for explicitly placed guides", () => {
    const result = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region", shape: "region" }))
        .geomPoint()
        .scales({ ...scaleColorDiscrete(), ...scaleShapeDiscrete() })
        .labs({ color: "Region", shape: "Region" })
        .guides({
          color: guideLegend({ position: "right" }),
          shape: guideLegend({ position: "bottom" }),
        })
        .spec(),
      { width: 720, height: 360 },
    );
    expect(
      result.scene.legends
        .map((legend) => legend.position)
        .toSorted((left, right) => (left ?? "").localeCompare(right ?? "")),
    ).toEqual(["bottom", "right"]);
    expect(result.scene.panels[0]?.width).toBeLessThan(620);
    expect(result.scene.panels[0]?.height).toBeLessThan(260);
    const bottomLegend = result.scene.legends.find((legend) => legend.position === "bottom");
    expect(bottomLegend!.width).toBeLessThanOrEqual(result.scene.panels[0]!.width);
    expect(bottomLegend!.y).toBeGreaterThanOrEqual(
      result.scene.panels[0]!.y + result.scene.panels[0]!.height + 32,
    );
    const svg = renderToSVGString(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .guides({ color: guideLegend({ position: "bottom", direction: "horizontal" }) })
        .spec(),
      { width: 420, height: 360 },
    );
    expect(svg).toContain("gg-legend-bottom gg-legend-horizontal");
    expect(svg).toContain(">North</text>");
  });

  it("keeps bottom guides inside the viewport when the y-axis has wide chrome", () => {
    const wideChromeRows = [
      { x: 0, y: "A very long category on the vertical axis", value: 0 },
      { x: 1, y: "Another very long category on the vertical axis", value: 1 },
    ];
    const result = runPipeline(
      gg(wideChromeRows, aes({ x: "x", y: "y", color: "value" }))
        .geomPoint()
        .scales({ y: { type: "band" }, ...scaleColorContinuous() })
        .guides({
          color: guideColorbar({
            position: "bottom",
            direction: "horizontal",
            theme: { colorbarLength: 512 },
          }),
        })
        .spec(),
      { width: 640, height: 360 },
    );
    const legend = result.scene.legends[0]!;
    expect(legend.x + legend.width).toBeLessThanOrEqual(result.scene.width - 2);
  });

  it("renders wrapped discrete labels as multiline SVG without ellipsis", () => {
    const wrappedRows = [
      { x: 1, y: 1, group: "A deliberately long northern category label" },
      { x: 2, y: 2, group: "A deliberately long southern category label" },
    ];
    const svg = renderToSVGString(
      gg(wrappedRows, aes({ x: "x", y: "y", color: "group" }))
        .geomPoint()
        .guides({
          color: guideLegend({
            position: "bottom",
            direction: "horizontal",
            collision: "wrap",
          }),
        })
        .spec(),
      { width: 190, height: 360 },
    );
    expect(svg).toContain("<tspan");
    expect(svg).toContain(">long northern</tspan>");
    expect(svg).toContain(">category label</tspan>");
    expect(svg).not.toContain("…");
  });

  it("renders measured colorbar title bands and horizontal ramp insets in pure SVG", () => {
    const spec = gg(rows, aes({ x: "x", y: "y", color: "x" }))
      .geomPoint()
      .scales(scaleColorContinuous())
      .guides({
        color: guideColorbar({
          title: "Value",
          position: "bottom",
          theme: { titleSize: 32 },
        }),
      })
      .spec();
    const result = runPipeline(spec, { width: 640, height: 360 });
    const legend = result.scene.legends[0];
    expect(legend?.type).toBe("ramp");
    if (legend?.type !== "ramp") return;
    const rampX = Math.round((legend.rampX ?? 0) * 100) / 100;
    const svg = renderToSVGString(spec, { width: 640, height: 360 });
    expect(svg).toContain('class="gg-legend-title" x="4" y="32"');
    expect(svg).toContain(`class="gg-legend-ramp" x="${String(rampX)}"`);
  });

  it("controls colorbar tick marks independently from complete semantic labels", () => {
    const spec = gg(rows, aes({ x: "x", y: "y", color: "x" }))
      .geomPoint()
      .scales(scaleColorContinuous())
      .guides({
        color: guideColorbar({
          position: "bottom",
          showTicks: false,
          showLabels: false,
        }),
      })
      .spec();
    const result = runPipeline(spec, { width: 640, height: 360 });
    const legend = result.scene.legends[0];
    expect(legend?.type).toBe("ramp");
    if (legend?.type !== "ramp") return;
    expect(legend.showTicks).toBe(false);
    expect(legend.ticks.every((tick) => tick.label === "" && tick.fullLabel !== "")).toBe(true);
    const svg = renderToSVGString(spec, { width: 640, height: 360 });
    expect(svg).not.toContain("gg-legend-tick");
    expect(svg).not.toContain("gg-legend-label");
  });

  it("suppresses identity guides by default and exposes exact values only when forced", () => {
    const identityRows = [
      { x: 1, y: 2, color: "#ff0000", size: 4 },
      { x: 2, y: 3, color: "#0000ff", size: 8 },
    ];
    const base = gg(identityRows, aes({ x: "x", y: "y", color: "color", size: "size" }))
      .geomPoint()
      .scales({ ...scaleColorIdentity(), ...scaleSizeIdentity() })
      .labs({ color: "Authored color", size: "Authored size" });
    expect(runPipeline(base.spec(), { width: 720, height: 360 }).scene.legends).toHaveLength(0);

    const forced = runPipeline(
      base
        .guides({
          color: guideLegend({ force: true }),
          size: guideLegend({ force: true }),
        })
        .spec(),
      { width: 720, height: 360 },
    );
    expect(forced.scene.legends).toHaveLength(2);
    expect(
      forced.scene.legends.every(
        (legend) => legend.type === "discrete" && legend.interactive === true,
      ),
    ).toBe(true);
  });

  it("uses each preceding guide block gap without reserving trailing whitespace", () => {
    const result = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region", shape: "region" }))
        .geomPoint()
        .labs({ color: "Color", shape: "Shape" })
        .guides({
          color: guideLegend({ position: "right", theme: { blockGap: 30 } }),
          shape: guideLegend({ position: "right", theme: { blockGap: 4 } }),
        })
        .spec(),
      { width: 720, height: 360 },
    );
    const [color, shape] = result.scene.legends;
    expect(shape?.y).toBe((color?.y ?? 0) + (color?.height ?? 0) + 30);
  });

  it("uses theme-owned guide roles and reserves bounded per-guide typography", () => {
    const baseline = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .spec(),
      { width: 720, height: 360 },
    );
    const result = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .theme({
          name: "light",
          guideTitleSize: 14,
          legendKeySize: 15,
          legendKeyGap: 8,
          guideBlockGap: 16,
        })
        .guides({
          x: guideAxis({ theme: { titleSize: 16, labelSize: 12 } }),
          color: guideLegend({ theme: { labelSize: 13 } }),
        })
        .spec(),
      { width: 720, height: 360 },
    );
    const legend = result.scene.legends[0];
    expect(legend).toMatchObject({ titleSize: 14, labelSize: 13, swatchSize: 15 });
    expect(result.scene.axes.x.titleSize).toBe(16);
    expect(result.scene.axes.x.ticks.every((tick) => tick.labelSize === 12)).toBe(true);
    expect(result.scene.panels[0]!.height).toBeLessThan(baseline.scene.panels[0]!.height);
  });

  it("rejects a guide variant that conflicts with an inferred scale family", () => {
    expect(() =>
      runPipeline(
        gg(rows, aes({ x: "x", y: "y", color: "x" }))
          .geomPoint()
          .guides({ color: guideLegend() })
          .spec(),
        { width: 640, height: 360 },
      ),
    ).toThrow(
      expect.objectContaining({ code: "guide-aesthetic-incompatible", path: "/guides/color" }),
    );
    expect(() =>
      runPipeline(
        gg(rows, aes({ x: "x", y: "y", color: "x" }))
          .geomPoint()
          .scales({ color: { guide: guideLegend() } })
          .spec(),
        { width: 640, height: 360 },
      ),
    ).toThrow(
      expect.objectContaining({
        code: "guide-aesthetic-incompatible",
        path: "/scales/color/guide",
      }),
    );
  });

  it("fails collision:error with a structured guide path instead of truncating silently", () => {
    const longRows = rows.map((row) => ({
      ...row,
      region: `${row.region} with a deliberately very long authored category label`,
    }));
    expect(() =>
      runPipeline(
        gg(longRows, aes({ x: "x", y: "y", color: "region" }))
          .geomPoint()
          .guides({ color: guideLegend({ position: "right", collision: "error" }) })
          .spec(),
        { width: 420, height: 360 },
      ),
    ).toThrow(expect.objectContaining({ code: "guide-layout-overflow", path: "/guides/color" }));
  });

  it("fails collision:error when the complete guide block exceeds viewport height", () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      x: index,
      y: index,
      group: `g${String(index)}`,
    }));
    expect(() =>
      runPipeline(
        gg(many, aes({ x: "x", y: "y", color: "group" }))
          .geomPoint()
          .guides({ color: guideLegend({ position: "bottom", collision: "error" }) })
          .spec(),
        { width: 320, height: 160 },
      ),
    ).toThrow(expect.objectContaining({ code: "guide-layout-overflow", path: "/guides/color" }));
  });

  it("checks collision:error against the translated right-guide area", () => {
    const groups = Array.from({ length: 5 }, (_, index) => ({
      x: index,
      y: index,
      group: `g${String(index)}`,
    }));
    expect(() =>
      runPipeline(
        gg(groups, aes({ x: "x", y: "y", color: "group" }))
          .geomPoint()
          .labs({ title: "A chart title", subtitle: "A chart subtitle" })
          .guides({ color: guideLegend({ position: "right", collision: "error" }) })
          .spec(),
        { width: 720, height: 160 },
      ),
    ).toThrow(expect.objectContaining({ code: "guide-layout-overflow", path: "/guides/color" }));
  });

  it("checks collision:error against the translated bottom-guide area", () => {
    const groups = Array.from({ length: 24 }, (_, index) => ({
      x: index,
      y: index,
      group: `g${String(index)}`,
    }));
    expect(() =>
      runPipeline(
        gg(groups, aes({ x: "x", y: "y", color: "group" }))
          .geomPoint()
          .labs({ caption: "A chart caption" })
          .guides({ color: guideLegend({ position: "bottom", collision: "error" }) })
          .spec(),
        { width: 720, height: 80 },
      ),
    ).toThrow(expect.objectContaining({ code: "guide-layout-overflow", path: "/guides/color" }));
  });

  it("uses top-level guide appearance over scale-local settings and supports suppression", () => {
    const configured = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .scales(
          scaleColorDiscrete({
            guide: guideLegend({ title: "Local", position: "right", keySize: 8 }),
          }),
        )
        .guides({
          color: guideLegend({ title: "Top", position: "bottom", keySize: 16 }),
        })
        .spec(),
      { width: 720, height: 360 },
    );
    expect(configured.scene.legends[0]).toMatchObject({
      title: "Top",
      position: "bottom",
      direction: "horizontal",
      swatchSize: 16,
    });

    const positionOverride = runPipeline(
      gg(rows, aes({ x: "region", y: "y" }))
        .geomPoint()
        .scales({ x: { type: "band", guide: { mode: "off" } } })
        .guides({ x: guideAxis({ showLabels: true }) })
        .spec(),
      { width: 720, height: 360 },
    );
    expect(
      positionOverride.scene.panels[0]!.axisX!.some(
        (tick) => tick.showLabel !== false && tick.label !== "",
      ),
    ).toBe(true);

    const hidden = runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "region" }))
        .geomPoint()
        .guides({ color: guideNone() })
        .spec(),
      { width: 720, height: 360 },
    );
    expect(hidden.scene.legends).toHaveLength(0);
  });
});
