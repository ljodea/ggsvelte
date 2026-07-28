/**
 * Single source of truth for the themes-page multi-series chart (Playfair 1824).
 * Live `<TemperaturesSpecimen>` and static SVG prerender both read from here.
 */
import { MONTH_BREAKS } from "./catalog.js";

export const TEMPERATURES_CHART = {
  key: "id",
  aes: { x: "month", y: "temp", color: "city" },
  inspect: { mode: "x" as const },
  labs: {
    title: "Playfair stocks, bread & exports, 1770–1824",
    x: "Year",
    y: "Index",
    color: "Series",
  },
  geomLine: { linewidth: 2 },
  geomPoint: { size: 2.5 },
  /** Year axis breaks shared with the rendered charts. */
  monthBreaks: MONTH_BREAKS,
} as const;
