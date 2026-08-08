/**
 * Field lists for Minard Inspect custom tooltips.
 *
 * Default tooltips dump every mapped aesthetic. The figurative map only needs
 * survivors; the cold strip only needs temperature + date. Empty dates are
 * omitted so blank Minard readings never show a ghost Date row.
 *
 * Map and strip are independent series (9 cold readings vs many path vertices
 * in HistData). Tooltips do not invent a join or drive linked selection.
 */

export type TooltipField = { readonly label: string; readonly value: string };

/** Narrow row shape used by map-march custom content. */
export type MarchTooltipRow = {
  readonly survivors?: unknown;
};

/** Narrow row shape used by cold-strip custom content. */
export type ColdTooltipRow = {
  readonly temp?: unknown;
  readonly date?: unknown;
  readonly long?: unknown;
};

/**
 * Map pin fields: Survivors only. Direction and coordinates are already
 * visible via color / band width / crosshair. Cold dates live on the strip.
 */
export function mapMarchTooltipFields(row: MarchTooltipRow): TooltipField[] {
  const fields: TooltipField[] = [];
  if (typeof row.survivors === "number" && Number.isFinite(row.survivors)) {
    fields.push({
      label: "Survivors",
      value: Math.round(row.survivors).toLocaleString("en-US"),
    });
  }
  return fields;
}

/**
 * Cold-strip pin fields: temperature always (when numeric); Date only when
 * non-empty (Minard left long 29.2 blank in the source).
 */
export function coldStripTooltipFields(row: ColdTooltipRow): TooltipField[] {
  const fields: TooltipField[] = [];
  if (typeof row.temp === "number" && Number.isFinite(row.temp)) {
    // U+2212 minus so negative temps match Minard's print feel in the pin.
    const signed = row.temp === 0 ? "0" : row.temp < 0 ? `−${String(-row.temp)}` : String(row.temp);
    fields.push({ label: "Temperature", value: `${signed} °Réaumur` });
  }
  if (typeof row.date === "string" && row.date.trim() !== "") {
    fields.push({ label: "Date", value: row.date });
  }
  return fields;
}
