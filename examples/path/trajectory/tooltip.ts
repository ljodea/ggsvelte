/**
 * Field lists for Minard Inspect custom tooltips.
 *
 * Default tooltips dump every mapped aesthetic (direction, long, lat, empty
 * date). The figurative map only needs survivors + cold date; the strip only
 * needs temperature + date. Empty dates are omitted so advance vertices never
 * show a ghost Date row.
 */

export type TooltipField = { readonly label: string; readonly value: string };

/** Narrow row shape used by map-march custom content. */
export type MarchTooltipRow = {
  readonly survivors?: unknown;
  readonly date?: unknown;
  readonly direction?: unknown;
  readonly long?: unknown;
  readonly lat?: unknown;
};

/** Narrow row shape used by cold-strip custom content. */
export type ColdTooltipRow = {
  readonly temp?: unknown;
  readonly date?: unknown;
  readonly long?: unknown;
};

/**
 * Map pin fields: Survivors always (when numeric); Date only when non-empty.
 * Direction and coordinates are already visible via color / crosshair.
 */
export function mapMarchTooltipFields(row: MarchTooltipRow): TooltipField[] {
  const fields: TooltipField[] = [];
  if (typeof row.survivors === "number" && Number.isFinite(row.survivors)) {
    fields.push({
      label: "Survivors",
      value: Math.round(row.survivors).toLocaleString("en-US"),
    });
  }
  if (typeof row.date === "string" && row.date.trim() !== "") {
    fields.push({ label: "Date", value: row.date });
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

/**
 * Station key for inspect-driven linked selection. Empty string / missing → null
 * so advance vertices clear the shared selection instead of publishing "".
 */
export function stationKeyFromInspectRow(
  row: { readonly stationKey?: unknown } | null | undefined,
): string | null {
  if (row === null || row === undefined) return null;
  const key = row.stationKey;
  if (typeof key === "string" && key !== "") return key;
  return null;
}

/**
 * Plot-level identity for the march map: cold-station points own `stationKey`
 * (they carry `temp`). Troop path vertices get unique non-link keys so they
 * never collide with stations (INTERACTION_DUPLICATE_KEY).
 */
export function mapRowIdentity(row: Record<string, unknown>): PropertyKey {
  const temp = row["temp"];
  const stationKey = row["stationKey"];
  if (typeof temp === "number" && typeof stationKey === "string" && stationKey !== "") {
    return stationKey;
  }
  return `troop:${String(row["leg"])}:${String(row["long"])}:${String(row["lat"])}:${String(row["survivors"])}`;
}
