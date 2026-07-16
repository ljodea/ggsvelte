/**
 * Pure plot-root layout chrome: inline size/theme style, responsive
 * breakpoint helpers, tooltip viewport clamp, and legend clear-control
 * anchor lookup. Hosts own class bindings and tool-rail visibility.
 */

const NARROW_TOOLS_MAX_WIDTH_PX = 560;
const DOCKED_TOOLTIP_MAX_WIDTH_PX = 480;
const DEFAULT_PLOT_WIDTH_PX = 640;
const DEFAULT_PLOT_HEIGHT_PX = 400;

export type ResolvePlotSizeInput = {
  /** Host width prop: fixed px, `"container"`, or omitted (container mode). */
  readonly width: number | "container" | undefined;
  readonly height: number | undefined;
  /** ResizeObserver content width when in container mode; null before first measure. */
  readonly containerWidth: number | null;
  /** Assembled spec width fallback. */
  readonly assembledWidth: number | undefined;
  /** Assembled spec height fallback. */
  readonly assembledHeight: number | undefined;
};

/**
 * Resolved plot pixel size for the pipeline and root style.
 * Container mode: measured container width, then assembled, then 640.
 * Fixed mode: the numeric width prop (assembled fallback is unused once fixed).
 * Height: height prop, then assembled, then 400.
 */
export function resolvePlotSize(input: ResolvePlotSizeInput): {
  readonly width: number;
  readonly height: number;
} {
  const width =
    input.width === undefined || input.width === "container"
      ? (input.containerWidth ?? input.assembledWidth ?? DEFAULT_PLOT_WIDTH_PX)
      : input.width;
  const height = input.height ?? input.assembledHeight ?? DEFAULT_PLOT_HEIGHT_PX;
  return { width, height };
}

/** True when the tool rail should use the narrow layout (width < 560). */
export function isNarrowToolsWidth(widthPx: number): boolean {
  return widthPx < NARROW_TOOLS_MAX_WIDTH_PX;
}

/**
 * True when a pinned tooltip should dock (width < 480).
 * Prefer `isTooltipDocked` at call sites that also gate on pin state.
 */
export function isDockedTooltipWidth(widthPx: number): boolean {
  return widthPx < DOCKED_TOOLTIP_MAX_WIDTH_PX;
}

/**
 * Whether the inspection tooltip (and root docked chrome class) should dock.
 * Unifies root class and Tooltip `docked` prop (both used pinned + width).
 */
export function isTooltipDocked(input: {
  readonly inspectionState: "transient" | "pinned" | "none" | null | undefined;
  readonly widthPx: number;
}): boolean {
  return input.inspectionState === "pinned" && isDockedTooltipWidth(input.widthPx);
}

/**
 * Capture-surface `aria-controls` when a pinned interactive tooltip is up.
 * Undefined otherwise (attribute omitted).
 */
export function resolveCaptureAriaControls(input: {
  readonly isPinned: boolean;
  readonly interactiveContent: boolean;
  readonly plotId: string;
}): string | undefined {
  if (!input.isPinned || !input.interactiveContent) return undefined;
  return `${input.plotId}-tooltip`;
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
