/**
 * Pure plot-root layout chrome: inline size/theme style, responsive
 * breakpoint helpers, tooltip viewport clamp, and legend clear-control
 * anchor lookup. Hosts own class bindings and tool-rail visibility.
 */

const NARROW_TOOLS_MAX_WIDTH_PX = 560;
const DOCKED_TOOLTIP_MAX_WIDTH_PX = 480;

/** True when the tool rail should use the narrow layout (width < 560). */
export function isNarrowToolsWidth(widthPx: number): boolean {
  return widthPx < NARROW_TOOLS_MAX_WIDTH_PX;
}

/**
 * True when a pinned tooltip should dock (width < 480).
 * Host still ANDs with pinned inspection state for the docked binding.
 */
export function isDockedTooltipWidth(widthPx: number): boolean {
  return widthPx < DOCKED_TOOLTIP_MAX_WIDTH_PX;
}

export type TooltipViewportSizeInput = {
  readonly sceneWidth: number;
  readonly sceneHeight: number;
  /** Host: `root?.clientWidth` — nullish falls back to scene; 0 is kept. */
  readonly clientWidth: number | null | undefined;
  /** Host: `root?.clientHeight` — nullish falls back to scene; 0 is kept. */
  readonly clientHeight: number | null | undefined;
};

/**
 * Tooltip layout box: min(scene, client) per axis.
 * Uses nullish coalesce so a laid-out zero client size does not fall back
 * to the scene (matches historical `root?.clientWidth ?? sceneWidth`).
 */
export function tooltipViewportSize(input: TooltipViewportSizeInput): {
  readonly width: number;
  readonly height: number;
} {
  return {
    width: Math.min(input.sceneWidth, input.clientWidth ?? input.sceneWidth),
    height: Math.min(input.sceneHeight, input.clientHeight ?? input.sceneHeight),
  };
}

export type PlotRootStyleInput = {
  /**
   * When true, emit width/height CSS before theme tokens.
   * Host: hasCanvas || interactive || emphasis || selection.
   */
  readonly needsSizedBox: boolean;
  /** True when the width prop is undefined or `"container"`. */
  readonly containerWidth: boolean;
  /** Fixed-width CSS uses scene dimensions (model scene with resolved fallback). */
  readonly sceneWidth: number;
  readonly sceneHeight: number;
  readonly themeStyle: string;
};

/**
 * Root `style` attribute value.
 * Sized box: `width:…;height:…;` then raw `themeStyle` (no extra separator).
 * Empty concatenation → `undefined` (matches host `… || undefined`).
 */
export function plotRootInlineStyle(input: PlotRootStyleInput): string | undefined {
  const sizeCss = input.needsSizedBox
    ? `width:${input.containerWidth ? "100%" : `${input.sceneWidth}px`};height:${input.sceneHeight}px;`
    : "";
  return `${sizeCss}${input.themeStyle}` || undefined;
}

export type ClearLegendXInput = {
  /**
   * Host: `interactionConfig.legendFocus !== null`.
   * Must stay even when `pressedScale` is non-null: controller emphasis can
   * briefly leave a pressed scale after legend focus is disabled; Clear is
   * intentionally suppressed then.
   */
  readonly legendFocusEnabled: boolean;
  /** Host: `effectiveLegendPressed?.scale ?? null`. */
  readonly pressedScale: string | null;
  /** Scene legends (need scale + x for the clear control anchor). */
  readonly legends: readonly { readonly scale: string; readonly x: number }[];
};

/**
 * X position for the legend clear control, or null to hide it.
 * null when legend focus is off, nothing is pressed, or no legend matches.
 */
export function resolveClearLegendX(input: ClearLegendXInput): number | null {
  if (!input.legendFocusEnabled || input.pressedScale === null) return null;
  return input.legends.find((legend) => legend.scale === input.pressedScale)?.x ?? null;
}
