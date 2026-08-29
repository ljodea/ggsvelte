import type { RenderModel } from "@ggsvelte/core";

import { applyDatumKey, type DatumKey } from "./datum-key.js";
import type { PlotInspectionChange, ZoomDomains } from "./interaction.js";
import { numericDomain } from "./plot-zoom.js";

export type ClientRect = { left: number; top: number; width: number; height: number };

export function clientRectOf(root: HTMLDivElement | null): ClientRect | null {
  if (root === null) return null;
  const box = root.getBoundingClientRect();
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

export function hitAt(
  event: { clientX: number; clientY: number },
  model: RenderModel | null,
  rect: ClientRect | null,
  datumKey: DatumKey,
  maxDistance: number,
) {
  if (model === null || rect === null) return null;
  const located = model.viewport.locate(event.clientX, event.clientY, rect);
  const panel = model.viewport.panelAtOrOnly(located);
  const hit = panel?.nearest(located, { mode: "auto", maxDistance });
  if (hit === undefined || hit === null) return null;
  const index = Math.max(hit.rowIndex ?? -1, 0);
  const rowIndex = hit.rowIndex ?? -1;
  const row = rowIndex >= 0 ? model.row(rowIndex) : null;
  const key = applyDatumKey(datumKey, row, index);
  return { hit, row, key, located, panel, rect };
}

export function inspectionFromHit(
  event: { clientX: number; clientY: number },
  found: NonNullable<ReturnType<typeof hitAt>>,
): PlotInspectionChange<Record<string, unknown>, PropertyKey> {
  const datum = {
    key: found.key,
    row: found.row,
    sourceKeys: [found.key] as PropertyKey[],
    lineageCount: 1,
    layerIndex: found.hit.layerIndex,
    panelId: found.hit.panelId,
    fields: [],
    anchor: { x: event.clientX - found.rect.left, y: event.clientY - found.rect.top },
  };
  return {
    type: "inspect",
    phase: "change",
    state: "transient",
    source: "pointer",
    panelId: found.hit.panelId,
    mode: found.hit.mode,
    focus: datum,
    members: [datum],
  };
}

export function zoomFromBrush(
  model: RenderModel,
  start: { x: number; y: number },
  end: { x: number; y: number },
): Partial<ZoomDomains> | null {
  const panel = model.viewport.panelAtOrOnly(end) ?? model.viewport.panelAtOrOnly(start);
  if (panel === null || panel === undefined) return null;
  const inverted = panel.invert({
    x0: Math.min(start.x, end.x),
    y0: Math.min(start.y, end.y),
    x1: Math.max(start.x, end.x),
    y1: Math.max(start.y, end.y),
  });
  const x = numericDomain(inverted.x);
  const y = numericDomain(inverted.y);
  if (x === undefined && y === undefined) return null;
  return {
    ...(x !== undefined && { x }),
    ...(y !== undefined && { y }),
  };
}
