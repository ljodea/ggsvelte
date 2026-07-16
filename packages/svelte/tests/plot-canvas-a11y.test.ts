import { describe, expect, it, vi } from "vitest";

import type { GeometryBatch, RenderModel } from "@ggsvelte/core";

import { A11Y_TABLE_CAP, a11yRows } from "../src/lib/canvas-a11y.js";
import PlotCanvasA11y from "../src/lib/PlotCanvasA11y.svelte";
import { render } from "./helpers/render.js";

function batch(partial: { layerIndex: number; rowIndex: number[] }): GeometryBatch {
  return {
    layerIndex: partial.layerIndex,
    geom: "point",
    rowIndex: new Uint32Array(partial.rowIndex),
  } as unknown as GeometryBatch;
}

function model(opts: {
  layerFields: Record<number, { field: string }[]>;
  rows: Record<number, Record<string, unknown> | null>;
}): RenderModel {
  return {
    layerFields: opts.layerFields,
    row: (index: number) => opts.rows[index] ?? null,
  } as unknown as RenderModel;
}

const sampleModel = model({
  layerFields: { 0: [{ field: "x" }, { field: "y" }] },
  rows: {
    0: { x: 1, y: 10 },
    1: { x: 2, y: 20 },
    2: { x: 3, y: 15 },
    3: { x: 4, y: 25 },
  },
});
const sampleBatches = [batch({ layerIndex: 0, rowIndex: [0, 1, 2, 3] })];

function until(predicate: () => boolean, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - started > timeout) {
        reject(new Error("until() timed out"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

describe("PlotCanvasA11y", () => {
  it("renders role=img summary with scene label and canvas mark total", () => {
    const { container } = render(PlotCanvasA11y, {
      model: sampleModel,
      batches: sampleBatches,
      sceneLabelText: "Scatter plot",
      open: false,
      onToggle: () => {},
    });
    const block = container.querySelector(".gg-canvas-a11y");
    expect(block).not.toBeNull();
    expect(block?.getAttribute("role")).toBe("img");
    expect(block?.getAttribute("aria-label")).toBe(
      "Scatter plot — 4 canvas-rendered marks. Canvas marks are not individually focusable; use the data table.",
    );
  });

  it("starts closed; toggle reports expanded and label text from open prop", async () => {
    const onToggle = vi.fn();
    const closed = render(PlotCanvasA11y, {
      model: sampleModel,
      batches: sampleBatches,
      sceneLabelText: "Plot",
      open: false,
      onToggle,
    });
    const toggle = closed.container.querySelector<HTMLButtonElement>(".gg-a11y-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(toggle?.textContent).toBe("Show data table");
    expect(closed.container.querySelector(".gg-a11y-table")).toBeNull();

    toggle?.click();
    expect(onToggle).toHaveBeenCalledTimes(1);

    const opened = render(PlotCanvasA11y, {
      model: sampleModel,
      batches: sampleBatches,
      sceneLabelText: "Plot",
      open: true,
      onToggle: () => {},
    });
    await until(() => opened.container.querySelector(".gg-a11y-table") !== null);
    const openToggle = opened.container.querySelector<HTMLButtonElement>(".gg-a11y-toggle");
    expect(openToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(openToggle?.textContent).toBe("Hide data table");
  });

  it("renders field headers and body rows from a11yRows", async () => {
    const { container } = render(PlotCanvasA11y, {
      model: sampleModel,
      batches: sampleBatches,
      sceneLabelText: "Plot",
      open: true,
      onToggle: () => {},
    });
    await until(() => container.querySelector(".gg-a11y-table") !== null);
    const table = container.querySelector(".gg-a11y-table");
    const expected = a11yRows(sampleModel, sampleBatches);
    expect([...(table?.querySelectorAll("th") ?? [])].map((t) => t.textContent)).toEqual(
      expected.fields,
    );
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(expected.rows.length);
    expect(table?.querySelector("p")).toBeNull();
  });

  it("shows truncation note when total exceeds materialised rows", async () => {
    const rows: Record<number, Record<string, unknown>> = {};
    const indices: number[] = [];
    for (let i = 0; i < A11Y_TABLE_CAP + 10; i++) {
      rows[i] = { x: i };
      indices.push(i);
    }
    const largeModel = model({
      layerFields: { 0: [{ field: "x" }] },
      rows,
    });
    const largeBatches = [batch({ layerIndex: 0, rowIndex: indices })];
    const { container } = render(PlotCanvasA11y, {
      model: largeModel,
      batches: largeBatches,
      sceneLabelText: "Large",
      open: true,
      onToggle: () => {},
    });
    await until(() => container.querySelector(".gg-a11y-table p") !== null);
    const note = container.querySelector(".gg-a11y-table p");
    expect(note?.textContent).toBe(
      `First ${String(A11Y_TABLE_CAP)} of ${String(A11Y_TABLE_CAP + 10)} rows.`,
    );
  });
});
