import type { CellValue, RenderModel } from "@ggsvelte/core";

import type { PlotInspectionChange } from "./interaction.js";

/** Accessible per-mark label from the layer's mapped fields. */
export function markLabel(
  model: RenderModel | null,
  row: number,
): string {
  if (model === null) return `data point ${row + 1}`;
  const values = model.row(row);
  if (values === null) return `data point ${row + 1}`;
  const fields = model.layerFields.flat();
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const f of fields) {
    if (seen.has(f.field)) continue;
    seen.add(f.field);
    parts.push(`${f.field} ${String(values[f.field] ?? "")}`);
  }
  return parts.join(", ") || `data point ${row + 1}`;
}

export function datumLabel(
  model: RenderModel | null,
  values: Record<string, CellValue> | null,
): string {
  if (values === null) return "No active datum";
  const fields = model?.layerFields.flat() ?? [];
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const field of fields) {
    if (seen.has(field.field)) continue;
    seen.add(field.field);
    parts.push(`${field.field} ${String(values[field.field] ?? "")}`);
  }
  return parts.join(", ") || "Active datum";
}

export function inspectionLiveText(
  model: RenderModel | null,
  value: PlotInspectionChange<Record<string, CellValue>, PropertyKey>,
): string {
  const count = value.members.length;
  const state = value.state === "pinned" ? ", pinned" : "";
  if (value.mode !== "x" && value.mode !== "y")
    return `${datumLabel(model, value.focus.row)}; ${String(count)} ${count === 1 ? "datum" : "data"}${state}`;
  const seen = new Set<string>();
  const focused = value.focus.fields
    .filter(
      (field) =>
        field.channel !== value.mode &&
        !seen.has(field.field) &&
        seen.add(field.field),
    )
    .map((field) => `${field.field} ${String(field.value ?? "")}`)
    .join(", ");
  return `${value.mode} ${value.axisLabel}; ${String(count)} ${count === 1 ? "datum" : "data"}${focused ? `; focused ${focused}` : ""}${state}`;
}
