/**
 * Layout measurer/theme and legend block for panel chrome.
 */
import { FONT_METRICS } from "../layout/font-metrics.js";
import type { LayoutTheme } from "../layout/layout.js";
import { DEFAULT_LAYOUT_THEME } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import { MetricsTableMeasurer } from "../layout/measure.js";
import type { LegendInput, LegendOrder } from "../legend.js";
import { buildLegends } from "../legend.js";
import type { ThemeTokens } from "../theme.js";

import type { RunOptions } from "./types.js";

export interface PanelLayoutLegends {
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  legendBlock: ReturnType<typeof buildLegends>;
}

export function resolvePanelLayoutLegends(input: {
  colorLegend: LegendInput | null;
  fillLegend: LegendInput | null;
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  options: Pick<RunOptions, "width" | "measureText">;
}): PanelLayoutLegends {
  const { theme, options } = input;
  const measurer = options.measureText ?? new MetricsTableMeasurer(FONT_METRICS);
  const layoutTheme = {
    ...DEFAULT_LAYOUT_THEME,
    fontSize: theme.axisTextSize,
    tickLength: theme.ticksX || theme.ticksY ? theme.tickLength : 0,
    tickLabelGap: theme.ticksX || theme.ticksY ? 3 : 5,
  };
  const legendInputs = [input.colorLegend, input.fillLegend].filter(
    (l): l is LegendInput => l !== null,
  );
  const legendBlock = buildLegends(
    legendInputs,
    input.legendOrder,
    measurer,
    Math.max(48, options.width * 0.35),
  );
  return { measurer, layoutTheme, legendBlock };
}
