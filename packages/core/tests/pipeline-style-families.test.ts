import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import type { PortableSpec } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.js";
import { resolveStyleScale } from "../src/pipeline/scale-style.js";
import type { LayerBinding, LayerFrame } from "../src/pipeline/types.js";
import { sceneToSVGString } from "../src/render-svg-scene.js";
import { ColumnTable } from "../src/table.js";

const viewport = { width: 640, height: 400 };

function pointStylesSpec(): PortableSpec {
  return fromAny({
    data: {
      values: [
        { x: 1, y: 1, amount: 0, opacity: 0, group: "a" },
        { x: 2, y: 2, amount: 50, opacity: 50, group: "b" },
        { x: 3, y: 3, amount: 100, opacity: 100, group: "c" },
      ],
    },
    aes: {
      x: { field: "x" },
      y: { field: "y" },
      size: { field: "amount" },
      alpha: { field: "opacity" },
      shape: { field: "group" },
    },
    layers: [{ geom: "point" }],
    scales: {
      size: { type: "sequential", range: [2, 10] },
      alpha: { type: "sequential", range: [0.2, 1] },
      shape: { type: "ordinal" },
    },
  });
}

describe("complete mapped style plumbing", () => {
  it("maps point size by area, alpha, and finite shapes into per-mark vectors", () => {
    const model = runPipeline(pointStylesSpec(), viewport);
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points batch");

    expect([...points.sizes!]).toEqual([2, Math.fround(Math.sqrt(52)), 10]);
    expect([...points.alphas!]).toEqual([Math.fround(0.2), Math.fround(0.6), 1]);
    expect([...points.shapeIndexes!]).toEqual([0, 1, 2]);

    const shapePlan = model.guidePlans.find((plan) => plan.aesthetic === "shape");
    if (shapePlan?.type !== "discrete") throw new Error("expected shape guide plan");
    expect(shapePlan.entries.map((entry) => entry.shape)).toEqual(["circle", "triangle", "square"]);
    expect(Object.isFrozen(shapePlan)).toBe(true);

    const svg = sceneToSVGString(model.scene);
    expect(svg).toContain('r="2"');
    expect(svg).toContain('opacity="0.2"');
    expect(svg).toContain("gg-shape-triangle");
    expect(svg).toContain("gg-shape-square");
    expect(svg).toContain('width="20" height="20"');
    expect(model.candidates.candidate(0)).toMatchObject({
      sizeValue: 0,
      alphaValue: 0,
      shapeValue: "a",
    });
  });

  it("maps linewidth, alpha, and linetype per subpath without reordering", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, series: "a", width: 1, opacity: 0.3 },
            { x: 2, y: 2, series: "a", width: 1, opacity: 0.3 },
            { x: 1, y: 2, series: "b", width: 5, opacity: 0.9 },
            { x: 2, y: 3, series: "b", width: 5, opacity: 0.9 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          group: { field: "series" },
          linewidth: { field: "width" },
          alpha: { field: "opacity" },
          linetype: { field: "series" },
        },
        layers: [{ geom: "line" }],
        scales: {
          linewidth: { type: "identity" },
          alpha: { type: "identity" },
          linetype: { type: "ordinal" },
        },
      }),
      viewport,
    );
    const paths = model.scene.batches.find((batch) => batch.kind === "paths");
    if (paths?.kind !== "paths") throw new Error("expected paths batch");

    expect([...paths.linewidths!]).toEqual([1, 5]);
    expect([...paths.alphas!]).toEqual([Math.fround(0.3), Math.fround(0.9)]);
    expect([...paths.linetypeIndexes!]).toEqual([0, 1]);

    const svg = sceneToSVGString(model.scene);
    expect(svg).toContain('stroke-width="1"');
    expect(svg).toContain('stroke-width="5"');
    expect(svg).toContain('stroke-dasharray="6 4"');
    expect(svg).toContain('opacity="0.3"');
    expect(svg).toContain('opacity="0.9"');

    const varying = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, width: 1 },
            { x: 2, y: 2, width: 3 },
            { x: 3, y: 3, width: 2 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, linewidth: { field: "width" } },
        layers: [{ geom: "line" }],
        scales: { linewidth: { type: "sequential", domain: [1, 3], range: [1, 5] } },
      }),
      viewport,
    );
    const varyingPaths = varying.scene.batches.find((batch) => batch.kind === "paths");
    if (varyingPaths?.kind !== "paths") throw new Error("expected varying paths");
    expect([...varyingPaths.pathOffsets]).toEqual([0, 2, 4]);
    expect([...varyingPaths.linewidths!]).toEqual([1, 5]);
    expect([...varyingPaths.frameRowIndex!]).toEqual([0, 1, 1, 2]);

    const afterStat = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 4 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          linewidth: { stat: "y" },
        },
        layers: [{ geom: "smooth", params: { method: "lm", se: false } }],
        scales: { linewidth: { type: "identity" } },
      }),
      viewport,
    );
    const first = afterStat.candidates.candidate(1);
    const duplicate = afterStat.candidates.candidate(2);
    expect(first?.x).toBeCloseTo(duplicate?.x ?? Number.NaN);
    expect(duplicate?.xValue).toBe(first?.xValue);
    expect(duplicate?.linewidthValue).toBe(first?.linewidthValue);
  });

  it("uses mapped point radii for candidate hit regions", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, radius: 2 },
            { x: 2, y: 2, radius: 10 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "radius" } },
        layers: [{ geom: "point" }],
        scales: { size: { type: "identity" } },
      }),
      viewport,
    );
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points batch");
    const smallX = points.positions[0]! + model.scene.panels[0]!.x;
    const smallY = points.positions[1]! + model.scene.panels[0]!.y;
    const largeX = points.positions[2]! + model.scene.panels[0]!.x;
    const largeY = points.positions[3]! + model.scene.panels[0]!.y;

    expect(model.candidates.hitTest(smallX + 6, smallY)).toBeNull();
    expect(model.candidates.hitTest(largeX + 6, largeY)?.rowIndex).toBe(1);

    const plus = runPipeline(
      fromAny({
        data: { values: [{ x: 1, y: 1, radius: 20 }] },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          size: { field: "radius" },
          shape: { value: "plus" },
        },
        layers: [{ geom: "point" }],
        scales: { size: { type: "identity" } },
      }),
      viewport,
    );
    const plusPoints = plus.scene.batches.find((batch) => batch.kind === "points");
    if (plusPoints?.kind !== "points") throw new Error("expected plus point");
    const plusPanel = plus.scene.panels[0]!;
    expect(
      plus.candidates.hitTest(
        plusPanel.x + plusPoints.positions[0]! + 24,
        plusPanel.y + plusPoints.positions[1]!,
      )?.rowIndex,
    ).toBe(0);
  });

  it("maps alpha through rectangles and size/alpha through text glyphs", () => {
    const bars = runPipeline(
      fromAny({
        data: {
          values: [
            { x: "a", y: 1, opacity: 0.2 },
            { x: "b", y: 2, opacity: 0.8 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, alpha: { field: "opacity" } },
        layers: [{ geom: "col" }],
        scales: { alpha: { type: "identity" } },
      }),
      viewport,
    );
    const rects = bars.scene.batches.find((batch) => batch.kind === "rects");
    if (rects?.kind !== "rects") throw new Error("expected rects batch");
    expect([...rects.alphas!]).toEqual([Math.fround(0.2), Math.fround(0.8)]);

    const mappedOverridesParam = runPipeline(
      fromAny({
        data: { values: [{ x: 1, y: 1, opacity: 0.8 }] },
        aes: { x: { field: "x" }, y: { field: "y" }, alpha: { field: "opacity" } },
        layers: [{ geom: "point", params: { alpha: 0.1 } }],
        scales: { alpha: { type: "identity" } },
      }),
      viewport,
    );
    const mappedPoint = mappedOverridesParam.scene.batches.find((batch) => batch.kind === "points");
    if (mappedPoint?.kind !== "points") throw new Error("expected mapped point");
    expect(mappedPoint.alpha).toBe(1);
    expect([...mappedPoint.alphas!]).toEqual([Math.fround(0.8)]);

    const text = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, label: "small", size: 8, opacity: 0.25 },
            { x: 2, y: 2, label: "large", size: 18, opacity: 0.75 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          label: { field: "label" },
          size: { field: "size" },
          alpha: { field: "opacity" },
        },
        layers: [{ geom: "text" }],
        scales: { size: { type: "identity" }, alpha: { type: "identity" } },
      }),
      viewport,
    );
    const glyphs = text.scene.batches.find((batch) => batch.kind === "glyphs");
    if (glyphs?.kind !== "glyphs") throw new Error("expected glyph batch");
    expect([...glyphs.sizes!]).toEqual([8, 18]);
    expect([...glyphs.alphas!]).toEqual([Math.fround(0.25), Math.fround(0.75)]);
    expect(sceneToSVGString(text.scene)).toContain('font-size="18"');
  });

  it("maps rule stroke styles and uses mapped widths for stroke hit regions", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, width: 1, opacity: 0.3, kind: "solid" },
            { x: 2, width: 8, opacity: 0.9, kind: "dashed" },
          ],
        },
        aes: {
          x: { field: "x" },
          linewidth: { field: "width" },
          alpha: { field: "opacity" },
          linetype: { field: "kind" },
        },
        layers: [{ geom: "rule" }],
        scales: {
          linewidth: { type: "identity" },
          alpha: { type: "identity" },
          linetype: { type: "identity" },
        },
      }),
      viewport,
    );
    const segments = model.scene.batches.find((batch) => batch.kind === "segments");
    if (segments?.kind !== "segments") throw new Error("expected segments batch");
    expect([...segments.linewidths!]).toEqual([1, 8]);
    expect([...segments.linetypeIndexes!]).toEqual([0, 1]);
    expect([...segments.alphas!]).toEqual([Math.fround(0.3), Math.fround(0.9)]);
    const panel = model.scene.panels[0]!;
    const wideX = panel.x + segments.segments[4]!;
    const wideY = panel.y + (segments.segments[5]! + segments.segments[7]!) / 2;
    expect(model.candidates.hitTest(wideX + 5, wideY)?.rowIndex).toBe(1);
  });

  it("carries stroke styles through area, smooth, errorbar, and boxplot composite batches", () => {
    const sharedScales = {
      linewidth: { type: "ordinal", range: [1, 4] },
      alpha: { type: "ordinal", range: [0.4, 1] },
      linetype: { type: "ordinal", range: ["solid", "dashed"] },
    };
    const styleAes = {
      linewidth: { field: "group" },
      alpha: { field: "group" },
      linetype: { field: "group" },
    };
    const area = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, group: "a" },
            { x: 2, y: 2, group: "a" },
            { x: 1, y: 2, group: "b" },
            { x: 2, y: 3, group: "b" },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          alpha: { field: "group" },
        },
        layers: [{ geom: "area", position: "identity" }],
        scales: { alpha: sharedScales.alpha },
      }),
      viewport,
    );
    const areaPaths = area.scene.batches.find((batch) => batch.kind === "paths");
    if (areaPaths?.kind !== "paths") throw new Error("expected area paths");
    expect(areaPaths.alphas).toBeDefined();

    const smooth = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, group: "a" },
            { x: 2, y: 2, group: "a" },
            { x: 1, y: 2, group: "b" },
            { x: 2, y: 4, group: "b" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, ...styleAes },
        layers: [{ geom: "smooth", params: { method: "lm", se: false } }],
        scales: sharedScales,
      }),
      viewport,
    );
    const smoothPaths = smooth.scene.batches.find((batch) => batch.kind === "paths");
    if (smoothPaths?.kind !== "paths") throw new Error("expected smooth paths");
    expect(smoothPaths.linewidths).toBeDefined();
    expect(smoothPaths.alphas).toBeDefined();
    expect(smoothPaths.linetypeIndexes).toBeDefined();

    const errorbar = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 2, ymin: 1, ymax: 3, group: "a" },
            { x: 2, y: 3, ymin: 2, ymax: 4, group: "b" },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          ymin: { field: "ymin" },
          ymax: { field: "ymax" },
          ...styleAes,
        },
        layers: [{ geom: "errorbar" }],
        scales: sharedScales,
      }),
      viewport,
    );
    const errorSegments = errorbar.scene.batches.find((batch) => batch.kind === "segments");
    if (errorSegments?.kind !== "segments") throw new Error("expected errorbar segments");
    expect(errorSegments.linewidths).toBeDefined();
    expect(errorSegments.alphas).toBeDefined();
    expect(errorSegments.linetypeIndexes).toBeDefined();

    const boxplot = runPipeline(
      fromAny({
        data: {
          values: [
            { x: "a", y: 1, group: "a" },
            { x: "a", y: 2, group: "a" },
            { x: "a", y: 3, group: "a" },
            { x: "b", y: 2, group: "b" },
            { x: "b", y: 3, group: "b" },
            { x: "b", y: 5, group: "b" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, ...styleAes },
        layers: [{ geom: "boxplot" }],
        scales: sharedScales,
      }),
      viewport,
    );
    const boxSegments = boxplot.scene.batches.find((batch) => batch.kind === "segments");
    const boxRects = boxplot.scene.batches.find((batch) => batch.kind === "rects");
    if (boxSegments?.kind !== "segments" || boxRects?.kind !== "rects") {
      throw new Error("expected boxplot composite batches");
    }
    expect(boxSegments.linewidths).toBeDefined();
    expect(boxSegments.alphas).toBeDefined();
    expect(boxSegments.linetypeIndexes).toBeDefined();
    expect(boxRects.alphas).toBeDefined();
    expect(boxRects.strokeWidths).toBeDefined();
    expect(boxRects.linetypeIndexes).toBeDefined();
  });

  it("applies literal and scaled styles to annotation rules and boxplot outlines", () => {
    const annotation = runPipeline(
      fromAny({
        data: { values: [{ x: 1, y: 1 }] },
        layers: [
          {
            geom: "rule",
            aes: {
              linewidth: { value: 5, scale: true },
              alpha: { value: 0.4, scale: true },
              linetype: { value: "dashed", scale: true },
            },
            params: { yintercept: 0.5 },
          },
        ],
        scales: {
          linewidth: { type: "identity" },
          alpha: { type: "identity" },
          linetype: { type: "identity" },
        },
      }),
      viewport,
    );
    const rule = annotation.scene.batches.find((batch) => batch.kind === "segments");
    if (rule?.kind !== "segments") throw new Error("expected annotation rule");
    expect([...rule.linewidths!]).toEqual([5]);
    expect([...rule.alphas!]).toEqual([Math.fround(0.4)]);
    expect([...rule.linetypeIndexes!]).toEqual([1]);

    const boxplot = runPipeline(
      fromAny({
        data: {
          values: [
            { x: "a", y: 1 },
            { x: "a", y: 2 },
            { x: "a", y: 3 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          linetype: { value: "dashed" },
        },
        layers: [{ geom: "boxplot" }],
      }),
      viewport,
    );
    const segments = boxplot.scene.batches.filter((batch) => batch.kind === "segments");
    const rects = boxplot.scene.batches.find((batch) => batch.kind === "rects");
    if (segments.length === 0 || rects?.kind !== "rects") {
      throw new Error("expected boxplot segments and rects");
    }
    for (const batch of segments) {
      if (batch.kind !== "segments") continue;
      expect(batch.linetype).toBe("dashed");
    }
    expect(rects.linetype).toBe("dashed");
  });

  it("trains binned finite styles from an explicit domain when data is empty", () => {
    // Empty mapped samples (runtime-filtered frame) must still train from an
    // explicit domain — same contract as numeric/color binned scales.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { shape: { field: "value" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: "value", statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 0,
      xNumeric: new Float64Array(0),
      yNumeric: new Float64Array(0),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array(0),
      shapeValues: [],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "shape",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: {
        type: "binned",
        domain: [0, 10],
        breaks: [0, 5, 10],
        range: ["circle", "square"],
      },
      prevState: null,
      title: "shape",
      warnings,
    });
    expect(resolution.guidePlan?.type).toBe("discrete");
    if (resolution.guidePlan?.type !== "discrete") throw new Error("expected discrete guide");
    expect(resolution.guidePlan.domain).toEqual([0, 5]);
  });

  it("keeps continuous mapped styles out of grouping and discrete stroke styles in grouping", () => {
    const rows = [
      { x: 1, y: 1, alpha: 0.2, kind: "a" },
      { x: 2, y: 2, alpha: 0.4, kind: "a" },
      { x: 3, y: 3, alpha: 0.6, kind: "b" },
      { x: 4, y: 4, alpha: 0.8, kind: "b" },
    ];
    const continuous = runPipeline(
      fromAny({
        data: { values: rows },
        aes: { x: { field: "x" }, y: { field: "y" }, alpha: { field: "alpha" } },
        layers: [{ geom: "smooth", params: { method: "lm", se: false } }],
        scales: { alpha: { type: "sequential" } },
      }),
      viewport,
    );
    const onePath = continuous.scene.batches.find((batch) => batch.kind === "paths");
    if (onePath?.kind !== "paths") throw new Error("expected smooth path");
    expect(onePath.pathOffsets).toHaveLength(2);

    const discrete = runPipeline(
      fromAny({
        data: { values: rows },
        aes: { x: { field: "x" }, y: { field: "y" }, linetype: { field: "kind" } },
        layers: [{ geom: "smooth", params: { method: "lm", se: false } }],
        scales: { linetype: { type: "ordinal" } },
      }),
      viewport,
    );
    const twoPaths = discrete.scene.batches.find((batch) => batch.kind === "paths");
    if (twoPaths?.kind !== "paths") throw new Error("expected grouped smooth paths");
    expect(twoPaths.pathOffsets).toHaveLength(3);
    expect([...twoPaths.linetypeIndexes!]).toEqual([0, 1]);

    const binned = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, value: 1 },
            { x: 2, y: 2, value: 2 },
            { x: 3, y: 3, value: 8 },
            { x: 4, y: 4, value: 9 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, linetype: { field: "value" } },
        layers: [{ geom: "smooth", params: { method: "lm", se: false } }],
        scales: { linetype: { type: "binned", breaks: [0, 5, 10] } },
      }),
      viewport,
    );
    const binnedPaths = binned.scene.batches.find((batch) => batch.kind === "paths");
    if (binnedPaths?.kind !== "paths") throw new Error("expected binned smooth paths");
    expect(binnedPaths.pathOffsets).toHaveLength(3);
    expect([...binnedPaths.linetypeIndexes!]).toEqual([0, 1]);

    const temporalBinned = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, when: "01/02/2024" },
            { x: 2, y: 2, when: "02/02/2024" },
            { x: 3, y: 3, when: "08/02/2024" },
            { x: 4, y: 4, when: "09/02/2024" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, linewidth: { field: "when" } },
        layers: [{ geom: "smooth", params: { method: "lm", se: false } }],
        scales: {
          linewidth: {
            type: "binned",
            temporalKind: "date",
            parse: "dmy",
            breaks: ["01/02/2024", "05/02/2024", "10/02/2024"],
          },
        },
      }),
      viewport,
    );
    const temporalPaths = temporalBinned.scene.batches.find((batch) => batch.kind === "paths");
    if (temporalPaths?.kind !== "paths") throw new Error("expected temporal binned paths");
    expect(temporalPaths.pathOffsets).toHaveLength(3);

    expect(() =>
      runPipeline(
        fromAny({
          data: {
            values: [
              { x: 1, y: 1, when: "01/02/2024" },
              { x: 2, y: 2, when: "08/02/2024" },
            ],
          },
          aes: { x: { field: "x" }, y: { field: "y" }, linewidth: { field: "when" } },
          layers: [{ geom: "line" }],
          scales: {
            linewidth: {
              type: "binned",
              temporalKind: "date",
              parse: "dmy",
              breaks: ["01/02/2024", "not-a-date", "10/02/2024"],
            },
          },
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "style-binned-breaks" }));
  });

  it("preserves temporal semantics and formatted date labels on numeric style guides", () => {
    const result = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, when: "2024-01-01" },
            { x: 2, y: 2, when: "2024-01-03" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "when" } },
        layers: [{ geom: "point" }],
        scales: {
          size: {
            type: "sequential",
            temporalKind: "date",
            parse: "ymd",
            labels: "%Y-%m-%d",
          },
        },
      }),
      viewport,
    );
    expect(result.scales.size?.scale.domain).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 3)]);
    const guide = result.guidePlans.find((plan) => plan.id === "guide:size");
    expect(guide?.type).toBe("discrete");
    if (guide?.type !== "discrete") throw new Error("expected size guide");
    expect(guide.entries[0]?.label).toBe("2024-01-01");
    const legend = result.scene.legends.find((candidate) => candidate.scale === "size");
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") throw new Error("expected discrete size legend");
    expect(legend.entries[0]?.label).toBe("2024-01-01");
  });

  it("supports manual, binned, identity, and explicit exhaustion policy", () => {
    const manual = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, group: "a" },
            { x: 2, y: 2, group: "b" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, shape: { field: "group" } },
        layers: [{ geom: "point" }],
        scales: { shape: { type: "manual", domain: ["a", "b"], range: ["circle", "diamond"] } },
      }),
      viewport,
    );
    const points = manual.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points");
    expect([...points.shapeIndexes!]).toEqual([0, 3]);
    expect(manual.scene.legends.find((legend) => legend.scale === "shape")).toBeDefined();

    const binned = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, value: 1 },
            { x: 2, y: 2, value: 1 },
            { x: 1, y: 2, value: 9 },
            { x: 2, y: 3, value: 9 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          group: { field: "value" },
          linetype: { field: "value" },
        },
        layers: [{ geom: "line" }],
        scales: { linetype: { type: "binned", breaks: [0, 5, 10], range: ["solid", "dashed"] } },
      }),
      viewport,
    );
    const paths = binned.scene.batches.find((batch) => batch.kind === "paths");
    if (paths?.kind !== "paths") throw new Error("expected paths");
    expect([...paths.linetypeIndexes!]).toEqual([0, 1]);

    expect(() =>
      runPipeline(
        fromAny({
          data: {
            values: Array.from({ length: 7 }, (_, index) => ({
              x: index,
              y: index,
              group: `g${index}`,
            })),
          },
          aes: { x: { field: "x" }, y: { field: "y" }, shape: { field: "group" } },
          layers: [{ geom: "point" }],
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "style-palette-exhausted" }));
  });

  it("resolves after-stat style mappings instead of dropping them", () => {
    const model = runPipeline(
      fromAny({
        data: { values: [{ category: "a" }, { category: "a" }, { category: "b" }] },
        aes: { x: { field: "category" }, alpha: { stat: "count" } },
        layers: [{ geom: "bar" }],
        scales: { alpha: { type: "sequential", domain: [1, 2], range: [0.25, 1] } },
      }),
      viewport,
    );
    const rects = model.scene.batches.find((batch) => batch.kind === "rects");
    if (rects?.kind !== "rects") throw new Error("expected bars");
    expect([...rects.alphas!].toSorted((left, right) => left - right)).toEqual([0.25, 1]);
    expect(
      [
        model.candidates.candidate(0)?.alphaValue,
        model.candidates.candidate(1)?.alphaValue,
      ].toSorted((left, right) => (left ?? 0) - (right ?? 0)),
    ).toEqual([1, 2]);
  });

  it("rejects unsupported continuous shape and incompatible geom mappings with fixes", () => {
    expect(() =>
      runPipeline(
        fromAny({
          data: { values: [{ x: 1, y: 2, value: 3 }] },
          aes: { x: { field: "x" }, y: { field: "y" }, shape: { field: "value" } },
          layers: [{ geom: "point" }],
          scales: { shape: { type: "sequential" } },
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "unsupported-aesthetic-scale" }));

    expect(() =>
      runPipeline(
        fromAny({
          data: { values: [{ x: 1, y: 2, group: "a" }] },
          aes: { x: { field: "x" }, y: { field: "y" }, shape: { field: "group" } },
          layers: [{ geom: "line" }],
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "unsupported-geom-aesthetic" }));
  });

  it("routes null to naValue and out-of-domain to unknownValue with warnings", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, amount: 10 },
            { x: 2, y: 2, amount: null },
            { x: 3, y: 3, amount: 200 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "amount" } },
        layers: [{ geom: "point" }],
        scales: {
          size: {
            type: "sequential",
            domain: [0, 100],
            range: [2, 10],
            naValue: 1,
            unknownValue: 99,
          },
        },
      }),
      viewport,
    );
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points");
    // size interpolates by area: sqrt(2^2 + 0.1*(10^2-2^2)) = sqrt(13.6) in-range;
    // null -> naValue (1); 200 is OOB -> unknownValue (99).
    expect([...points.sizes!]).toEqual([Math.fround(Math.sqrt(13.6)), 1, 99]);
    expect(model.warnings.some((warning) => warning.code === "style-na-values")).toBe(true);
    expect(model.warnings.some((warning) => warning.code === "style-unknown-values")).toBe(true);
  });

  it("clamps out-of-domain values under oob squish without an unknown warning", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, amount: 10 },
            { x: 2, y: 2, amount: 200 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "amount" } },
        layers: [{ geom: "point" }],
        scales: { size: { type: "sequential", domain: [0, 100], range: [2, 10], oob: "squish" } },
      }),
      viewport,
    );
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points");
    // 200 clamps to the domain max (100) -> range max (10) rather than the unknown style.
    expect([...points.sizes!]).toEqual([Math.fround(Math.sqrt(13.6)), 10]);
    expect(model.warnings.some((warning) => warning.code === "style-unknown-values")).toBe(false);
  });

  it("cycles finite shapes past the palette when onExhaust is cycle", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: Array.from({ length: 7 }, (_, index) => ({
            x: index,
            y: index,
            group: `g${index}`,
          })),
        },
        aes: { x: { field: "x" }, y: { field: "y" }, shape: { field: "group" } },
        layers: [{ geom: "point" }],
        scales: { shape: { type: "ordinal", onExhaust: "cycle" } },
      }),
      viewport,
    );
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points");
    // Six named symbols; the seventh group wraps to the first instead of throwing.
    expect([...points.shapeIndexes!]).toEqual([0, 1, 2, 3, 4, 5, 0]);
  });

  it("rejects a binned domain that disagrees with its boundaries", () => {
    expect(() =>
      runPipeline(
        fromAny({
          data: { values: [{ x: 1, y: 1, amount: 3 }] },
          aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "amount" } },
          layers: [{ geom: "point" }],
          scales: { size: { type: "binned", domain: [0, 50], breaks: [0, 5, 10], range: [2, 6] } },
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "style-domain-invalid" }));
  });

  it("fails deterministically when temporal style values cannot be parsed", () => {
    expect(() =>
      runPipeline(
        fromAny({
          data: {
            values: [
              { x: 1, y: 1, when: "2024-01-01" },
              { x: 2, y: 2, when: "not-a-date" },
            ],
          },
          aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "when" } },
          layers: [{ geom: "point" }],
          scales: { size: { type: "sequential", temporalKind: "date", parse: "ymd" } },
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "style-temporal-parse" }));
  });
});
