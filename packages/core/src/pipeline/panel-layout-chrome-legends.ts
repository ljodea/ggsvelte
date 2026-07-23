/**
 * Layout measurer/theme and legend block for panel chrome.
 */
import { FONT_METRICS } from "../layout/font-metrics.js";
import type { LayoutTheme } from "../layout/layout.js";
import { DEFAULT_LAYOUT_THEME } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import { MetricsTableMeasurer } from "../layout/measure.js";
import type { LegendInput, LegendOrder } from "../legend.js";
import { buildLegends, LegendLayoutError } from "../legend.js";
import type { ThemeTokens } from "../theme.js";

import { PipelineError, type RunOptions } from "./types.js";

export interface PanelLayoutLegends {
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  legendBlock: ReturnType<typeof buildLegends>;
}

export function resolvePanelLayoutLegends(input: {
  legendInputs: readonly LegendInput[];
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  layoutAxisTextSize: number;
  options: Pick<RunOptions, "width" | "height" | "measureText">;
}): PanelLayoutLegends {
  const { theme, options } = input;
  const measurer = options.measureText ?? new MetricsTableMeasurer(FONT_METRICS);
  const layoutTheme = {
    ...DEFAULT_LAYOUT_THEME,
    fontSize: input.layoutAxisTextSize,
    tickLength: theme.ticksX || theme.ticksY ? theme.tickLength : 0,
    tickLabelGap: theme.ticksX || theme.ticksY ? 3 : 5,
  };
  const legendInputs = input.legendInputs.map((legend) => ({
    ...legend,
    appearance: {
      type:
        legend.appearance?.type ??
        (legend.kind === "ramp" ? "colorbar" : legend.kind === "steps" ? "colorsteps" : "legend"),
      title: legend.appearance?.title ?? legend.title,
      order: legend.appearance?.order ?? 0,
      position: legend.appearance?.position ?? "auto",
      direction: legend.appearance?.direction ?? "auto",
      ...legend.appearance,
      ...(legend.kind === "discrete" && {
        keySize: legend.appearance?.keySize ?? theme.legendKeySize,
      }),
      theme: {
        titleSize: theme.guideTitleSize,
        labelSize: theme.axisTextSize,
        keyGap: theme.legendKeyGap,
        rowGap: theme.legendRowGap,
        blockGap: theme.guideBlockGap,
        colorbarThickness: theme.colorbarThickness,
        colorbarLength: theme.colorbarLengthMin,
        ...legend.appearance?.theme,
      },
    },
  })) as typeof input.legendInputs;
  try {
    const legendBlock = buildLegends(
      legendInputs,
      input.legendOrder,
      measurer,
      Math.max(48, options.width * 0.35),
      options.width,
      options.height,
    );
    return { measurer, layoutTheme, legendBlock };
  } catch (error) {
    if (error instanceof LegendLayoutError) {
      throw new PipelineError(
        "guide-layout-overflow",
        `/guides/${error.scale}`,
        `${error.message} ${error.recovery}`,
      );
    }
    throw error;
  }
}
