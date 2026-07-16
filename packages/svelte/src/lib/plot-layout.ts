/**
 * Pure plot-root layout chrome: inline size/theme style and responsive
 * breakpoint helpers. Hosts own class bindings and tool-rail visibility.
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
