/**
 * Custom Inspect tip fields for the Minard example.
 * Map: survivors. Cold strip: temperature and date (omit blank dates).
 */

export type TooltipField = { readonly label: string; readonly value: string };

export function mapMarchTooltipFields(row: { readonly survivors?: unknown }): TooltipField[] {
  if (typeof row.survivors !== "number" || !Number.isFinite(row.survivors)) {
    return [];
  }
  return [
    {
      label: "Survivors",
      value: Math.round(row.survivors).toLocaleString("en-US"),
    },
  ];
}

export function coldStripTooltipFields(row: {
  readonly temp?: unknown;
  readonly date?: unknown;
}): TooltipField[] {
  const fields: TooltipField[] = [];
  if (typeof row.temp === "number" && Number.isFinite(row.temp)) {
    // U+2212 minus so negatives match Minard's print feel.
    const signed = row.temp === 0 ? "0" : row.temp < 0 ? `−${String(-row.temp)}` : String(row.temp);
    fields.push({ label: "Temperature", value: `${signed} °Réaumur` });
  }
  if (typeof row.date === "string" && row.date.trim() !== "") {
    fields.push({ label: "Date", value: row.date });
  }
  return fields;
}
