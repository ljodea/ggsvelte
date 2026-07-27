/**
 * Single source of truth for the themes-page temperatures multi-series chart.
 * The live `<TemperaturesSpecimen>` and the copyable `heroThemePaletteSnippet`
 * both read from here so the snippet cannot drift from what the page renders.
 */
import { MONTH_BREAKS } from "./catalog.js";

export const TEMPERATURES_CHART = {
  key: "id",
  aes: { x: "month", y: "temp", color: "city" },
  inspect: { mode: "x" as const },
  labs: {
    title: "Monthly mean temperature",
    x: "Month",
    y: "Temperature (°C)",
    color: "City",
  },
  geomLine: { linewidth: 2 },
  geomPoint: { size: 2.5 },
  /** Month axis breaks shared with the rendered charts. */
  monthBreaks: MONTH_BREAKS,
} as const;

/** Format month breaks for a consumer-facing Scale value literal. */
export function formatMonthBreaksLiteral(
  breaks: readonly number[] = TEMPERATURES_CHART.monthBreaks,
): string {
  return `[${breaks.join(", ")}]`;
}
