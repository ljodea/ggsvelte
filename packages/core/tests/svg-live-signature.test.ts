/**
 * sceneSignature structural-key tests (#1471).
 *
 * The live SVG patcher positionally patches DOM only when the new scene's
 * signature matches the mounted one. These tests pin the contract:
 * - data-only changes (positions, colors, ticks, strip text) keep the key;
 * - any change that alters DOM topology (counts, presence, element kinds,
 *   panel routing) changes the key and forces a remount.
 */
import { describe, expect, it } from "bun:test";

import type { GeometryBatch, Scene, ScenePanel } from "../src/scene.js";
import { resolveTheme } from "../src/theme.js";
import { sceneSignature } from "../src/svg-live/signature.js";

function basePanel(overrides: Partial<ScenePanel> = {}): ScenePanel {
  return {
    id: "p0",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    strip: "",
    axisX: { ticks: [], title: "" },
    axisY: { ticks: [], title: "" },
    grid: { x: [10], y: [20] },
    clip: true,
    ...overrides,
  };
}

function pointsBatch(n: number, overrides: Record<string, unknown> = {}): GeometryBatch {
  const positions = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    positions[i * 2] = i;
    positions[i * 2 + 1] = i * 2;
  }
  return {
    kind: "points",
    layerIndex: 0,
    panelIndex: 0,
    positions,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
    size: 2,
    alpha: 1,
    shape: "circle",
    fill: "red",
    ...overrides,
  } as unknown as GeometryBatch;
}

function baseScene(batches: GeometryBatch[], overrides: Partial<Scene> = {}): Scene {
  return {
    width: 200,
    height: 200,
    panels: [basePanel()],
    batches,
    axes: { x: { ticks: [], title: "" }, y: { ticks: [], title: "" } },
    grid: { x: [10], y: [20] },
    legends: [],
    theme: resolveTheme(),
    title: "",
    subtitle: "",
    caption: "",
    ...overrides,
  };
}

describe("sceneSignature — stable across data-only updates", () => {
  it("ignores point positions, sizes, and colors", () => {
    const a = baseScene([pointsBatch(4)]);
    const moved = pointsBatch(4, { fill: "blue" });
    (moved as { positions: Float32Array }).positions[0] = 999;
    const b = baseScene([moved]);
    expect(sceneSignature(a)).toBe(sceneSignature(b));
  });

  it("ignores axis tick values and strip text", () => {
    const a = baseScene([], {
      panels: [basePanel({ strip: "year 2023", showStrip: true })],
    });
    const b = baseScene([], {
      panels: [
        basePanel({
          strip: "year 2024",
          showStrip: true,
          axisX: { ticks: [{ pos: 5, label: "5", kind: "major" }], title: "x" },
        }),
      ],
    });
    expect(sceneSignature(a)).toBe(sceneSignature(b));
  });

  it("ignores panel geometry (x/y/width/height) moves", () => {
    const a = baseScene([]);
    const b = baseScene([], { panels: [basePanel({ x: 40, width: 120 })] });
    expect(sceneSignature(a)).toBe(sceneSignature(b));
  });
});

describe("sceneSignature — changes on topology drift", () => {
  it("panel count", () => {
    const a = baseScene([]);
    const b = baseScene([], { panels: [basePanel(), basePanel({ id: "p1" })] });
    expect(sceneSignature(a)).not.toBe(sceneSignature(b));
  });

  it("point mark count", () => {
    expect(sceneSignature(baseScene([pointsBatch(4)]))).not.toBe(
      sceneSignature(baseScene([pointsBatch(5)])),
    );
  });

  it("shapeIndexes presence (per-mark tags vary)", () => {
    const withIndexes = pointsBatch(4, { shapeIndexes: new Uint8Array([0, 0, 0, 0]) });
    expect(sceneSignature(baseScene([pointsBatch(4)]))).not.toBe(
      sceneSignature(baseScene([withIndexes])),
    );
  });

  it("paths subpath count and fills presence (area vs line)", () => {
    const line = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(6),
      rowIndex: Uint32Array.from([0, 1, 2]),
      pathOffsets: Uint32Array.from([0, 3]),
      curve: "linear",
    } as unknown as GeometryBatch;
    const twoPaths = {
      ...line,
      pathOffsets: Uint32Array.from([0, 2, 3]),
    } as GeometryBatch;
    const area = { ...line, fills: ["red"] } as unknown as GeometryBatch;
    expect(sceneSignature(baseScene([line]))).not.toBe(sceneSignature(baseScene([twoPaths])));
    expect(sceneSignature(baseScene([line]))).not.toBe(sceneSignature(baseScene([area])));
  });

  it("rect and segment counts; segment render mode", () => {
    const rect = (n: number): GeometryBatch =>
      ({
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects: new Float32Array(n * 4),
        rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
        fill: "red",
      }) as GeometryBatch;
    expect(sceneSignature(baseScene([rect(2)]))).not.toBe(sceneSignature(baseScene([rect(3)])));

    const seg = (withRender: boolean): GeometryBatch =>
      ({
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments: new Float32Array(8),
        rowIndex: Uint32Array.from([0, 1]),
        ...(withRender
          ? { renderPositions: new Float32Array(8), renderPathOffsets: Uint32Array.from([0, 2]) }
          : {}),
      }) as GeometryBatch;
    expect(sceneSignature(baseScene([seg(false)]))).not.toBe(
      sceneSignature(baseScene([seg(true)])),
    );
  });

  it("batch routing across panels (per-panel key list)", () => {
    const p0 = pointsBatch(2);
    const p1 = pointsBatch(2, { panelIndex: 1, layerIndex: 1 });
    const panels = [basePanel(), basePanel({ id: "p1", x: 110 })];
    const a = baseScene([p0, p1], { panels });
    const swapped = baseScene([p1, { ...p0, panelIndex: 1, layerIndex: 1 }], {
      panels,
    });
    expect(sceneSignature(a)).not.toBe(sceneSignature(swapped));
  });

  it("axis/strip/title/legend presence", () => {
    const plain = baseScene([]);
    const noAxis = baseScene([], { panels: [basePanel({ axisY: null })] });
    expect(sceneSignature(plain)).not.toBe(sceneSignature(noAxis));

    const withTitle = baseScene([], { title: "Hello" });
    expect(sceneSignature(plain)).not.toBe(sceneSignature(withTitle));

    const withStrip = baseScene([], { panels: [basePanel({ strip: "s", showStrip: true })] });
    expect(sceneSignature(plain)).not.toBe(sceneSignature(withStrip));

    const withLegend = baseScene([], {
      legends: [
        {
          type: "discrete",
          scale: "color",
          title: "c",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          entries: [],
        },
      ],
    });
    expect(sceneSignature(plain)).not.toBe(sceneSignature(withLegend));
  });

  it("letterbox gutter count", () => {
    const noGutter = baseScene([], {
      panels: [basePanel({ allocation: { x: 0, y: 0, width: 100, height: 100 } })],
    });
    const oneGutter = baseScene([], {
      panels: [basePanel({ allocation: { x: -10, y: 0, width: 110, height: 100 } })],
    });
    expect(sceneSignature(noGutter)).not.toBe(sceneSignature(oneGutter));
  });

  it("glyph batches always count (rebuild path, never patched)", () => {
    const glyphs = (n: number): GeometryBatch =>
      ({
        kind: "glyphs",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array(n * 2),
        rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
        texts: Array.from({ length: n }, () => "t"),
      }) as unknown as GeometryBatch;
    expect(sceneSignature(baseScene([glyphs(1)]))).not.toBe(sceneSignature(baseScene([glyphs(2)])));
  });
});
