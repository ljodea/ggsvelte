/** Deterministic semantic legend construction and responsive right/bottom planning. */
import type { GuideThemeSpec, StyleAesthetic } from "@ggsvelte/spec";

import type { TextMeasurer } from "./layout/measure.js";
import { linearTicks } from "./layout/ticks.js";
import { truncateToFit } from "./layout/truncate.js";
import type { Linetype, PointShape } from "./scales/style.js";
import { encodeKey } from "./scales/state.js";
import { bandKey } from "./scales/train.js";
import type { SceneLegend, SceneLegendEntry } from "./scene.js";

export type LegendOrder = "stable-domain" | "present-first-seen" | "sorted";
type GuidePosition = "auto" | "right" | "bottom";
type GuideDirection = "auto" | "vertical" | "horizontal";

export interface ResolvedLegendAppearance {
  type: "legend" | "colorbar" | "colorsteps" | "none";
  title: string;
  order: number;
  position: GuidePosition;
  direction: GuideDirection;
  keySize?: number;
  collision?: "ellipsis" | "wrap" | "error";
  force?: boolean;
  showTicks?: boolean;
  showLabels?: boolean;
  theme?: GuideThemeSpec;
}

interface LegendKeyStyle {
  color?: string;
  size?: number;
  linewidth?: number;
  alpha?: number;
  shape?: PointShape;
  linetype?: Linetype;
}

export interface DiscreteLegendInput {
  kind: "discrete";
  scale: "color" | "fill" | StyleAesthetic;
  aesthetics?: readonly ("color" | "fill" | StyleAesthetic)[];
  appearance?: ResolvedLegendAppearance;
  title: string;
  domain: readonly unknown[];
  firstSeen: readonly unknown[];
  interactive?: boolean;
  colorOf?(value: unknown): string | undefined;
  keyOf?(value: unknown): LegendKeyStyle;
  labelOf?(value: unknown): string;
}

export interface RampLegendInput {
  kind: "ramp";
  scale: "color" | "fill";
  aesthetics?: readonly ("color" | "fill")[];
  appearance?: ResolvedLegendAppearance;
  title: string;
  domain: [number, number];
  at(t: number): string;
  format(value: number): string;
  /** Complete semantic label used for accessibility/details when display text is abbreviated. */
  formatFull?(value: number): string;
  ticks?: readonly number[];
  position?: (value: number) => number;
}

export interface StepsLegendInput {
  kind: "steps";
  scale: "color" | "fill";
  aesthetics?: readonly ("color" | "fill")[];
  appearance?: ResolvedLegendAppearance;
  title: string;
  entries: readonly Readonly<{ label: string; color: string }>[];
}

export type LegendInput = DiscreteLegendInput | RampLegendInput | StepsLegendInput;

const FONT_SIZE = 11;
const TITLE_HEIGHT = 18;
const TITLE_DESCENDER_GAP = 7;
export const LEGEND_ROW_HEIGHT = 24;
const SWATCH_SIZE = 10;
const SWATCH_GAP = 6;
const PADDING = 4;
const BLOCK_GAP = 12;
const RAMP_WIDTH = 12;
const HORIZONTAL_RAMP_LENGTH = 180;
const RAMP_STOP_COUNT = 10;
const STEP_HEIGHT = 24;
const UNKNOWN_COLOR = "#999999";
const MIN_READABLE_PANEL = 320;
const ESTIMATED_NON_LEGEND_CHROME = 80;
const AUTO_BOTTOM_MAX_WIDTH = 480;

export interface LegendBlock {
  legends: SceneLegend[];
  /** Width reserved on the right. */
  width: number;
  /** Height occupied by right-positioned blocks. */
  height: number;
  /** Height reserved below the panel for bottom-positioned blocks. */
  bottomHeight: number;
  /** True when at least one auto-positioned guide degraded from right to bottom. */
  autoMovedBottom: boolean;
}

export class LegendLayoutError extends Error {
  constructor(
    readonly scale: string,
    readonly label: string,
    detail?: string,
    readonly recovery = 'Use collision: "ellipsis", move the guide below, or shorten the label.',
  ) {
    super(detail ?? `The ${scale} guide label "${label}" cannot fit without truncation.`);
    this.name = "LegendLayoutError";
  }
}

function orderedValues(input: DiscreteLegendInput, order: LegendOrder): unknown[] {
  switch (order) {
    case "present-first-seen": {
      const domainKeys = new Set(input.domain.map((value) => encodeKey(value)));
      const seen = new Set<string>();
      const out: unknown[] = [];
      for (const value of input.firstSeen) {
        const key = encodeKey(value);
        if (!domainKeys.has(key) || seen.has(key)) continue;
        seen.add(key);
        out.push(value);
      }
      return out;
    }
    case "sorted":
      return [...input.domain].toSorted((a, b) => bandKey(a).localeCompare(bandKey(b), "en"));
    default:
      return [...input.domain];
  }
}

function valueKind(value: unknown): string {
  if (value instanceof Date) return "date";
  if (value === null) return "null";
  if (typeof value === "string") return "text";
  return typeof value;
}

export function disambiguatedLabels(values: readonly unknown[]): string[] {
  const raw = values.map((value) => bandKey(value));
  const counts = new Map<string, number>();
  for (const label of raw) counts.set(label, (counts.get(label) ?? 0) + 1);
  return raw.map((label, index) =>
    (counts.get(label) ?? 0) > 1 ? `${label} (${valueKind(values[index])})` : label,
  );
}

/** Ellipsis for legend entry truncation (same glyph as axis paths). */
const LEGEND_ELLIPSIS = "…";

/** Binary-search truncation shared with axis layout, honoring guide typography. */
function truncate(
  label: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
): string {
  return truncateToFit(label, maxWidth, measurer, fontSize, LEGEND_ELLIPSIS);
}

/** Greedy, lossless wrapping. Over-wide tokens are split instead of ellipsized. */
function wrapLegendLabel(
  label: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
): string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    if (current !== "") lines.push(current);
    current = "";
  };
  for (const word of words) {
    const trial = current === "" ? word : `${current} ${word}`;
    if (measurer.measureWidth(trial, fontSize) <= maxWidth) {
      current = trial;
      continue;
    }
    flush();
    let chunk = "";
    for (const character of word) {
      const next = `${chunk}${character}`;
      if (chunk !== "" && measurer.measureWidth(next, fontSize) > maxWidth) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  }
  flush();
  return lines;
}

function presentedDiscreteLabel(
  fullLabel: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  appearance: ResolvedLegendAppearance | undefined,
  scale: string,
): { label: string; lines?: string[]; width: number; height: number; lineHeight: number } {
  const lineHeight = measurer.measureHeight(fontSize);
  if (appearance?.collision === "wrap") {
    const lines = wrapLegendLabel(fullLabel, maxWidth, measurer, fontSize);
    return {
      label: lines.join(" "),
      lines,
      width: Math.max(0, ...lines.map((line) => measurer.measureWidth(line, fontSize))),
      height: lines.length * lineHeight,
      lineHeight,
    };
  }
  const label = truncate(fullLabel, maxWidth, measurer, fontSize);
  if (appearance?.collision === "error" && label !== fullLabel)
    throw new LegendLayoutError(scale, fullLabel);
  return {
    label,
    width: measurer.measureWidth(label, fontSize),
    height: lineHeight,
    lineHeight,
  };
}

function legendTitleHeight(title: string, titleSize: number): number {
  return title === "" ? 0 : Math.max(TITLE_HEIGHT, titleSize + TITLE_DESCENDER_GAP);
}

function settings(input: LegendInput, position: "right" | "bottom") {
  const appearance = input.appearance;
  const theme = appearance?.theme;
  const direction =
    appearance?.direction === undefined || appearance.direction === "auto"
      ? position === "bottom"
        ? "horizontal"
        : "vertical"
      : appearance.direction;
  return {
    appearance,
    position,
    direction,
    title: appearance?.title ?? input.title,
    titleSize: theme?.titleSize ?? FONT_SIZE,
    labelSize: theme?.labelSize ?? FONT_SIZE,
    keySize: appearance?.keySize ?? SWATCH_SIZE,
    keyGap: theme?.keyGap ?? SWATCH_GAP,
    rowGap: theme?.rowGap ?? 0,
    blockGap: theme?.blockGap ?? BLOCK_GAP,
    rampThickness: theme?.colorbarThickness ?? RAMP_WIDTH,
    rampLength: theme?.colorbarLength ?? HORIZONTAL_RAMP_LENGTH,
  } as const;
}

function presentedContinuousLabel(input: {
  fullLabel: string;
  availableWidth: number;
  measurer: TextMeasurer;
  fontSize: number;
  appearance: ResolvedLegendAppearance | undefined;
  show: boolean;
  scale: string;
}): string {
  if (!input.show) return "";
  const label = truncate(input.fullLabel, input.availableWidth, input.measurer, input.fontSize);
  if (input.appearance?.collision === "error" && label !== input.fullLabel)
    throw new LegendLayoutError(input.scale, input.fullLabel);
  return label;
}

function resolvePosition(input: LegendInput, autoBottom: boolean): "right" | "bottom" {
  const authored = input.appearance?.position;
  return authored === "right" || authored === "bottom" ? authored : autoBottom ? "bottom" : "right";
}

function buildDiscrete(
  input: DiscreteLegendInput,
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
  position: "right" | "bottom",
): SceneLegend {
  const style = settings(input, position);
  const values = orderedValues(input, order);
  const fullLabels =
    input.labelOf === undefined
      ? disambiguatedLabels(values)
      : values.map((value) => input.labelOf?.(value) ?? "");
  const titleHeight = legendTitleHeight(style.title, style.titleSize);
  const keys = values.map((value) => input.keyOf?.(value) ?? {});
  // Renderers cap point radii at half the swatch edge. Grow the key box so
  // mapped size keys remain visually distinct instead of collapsing at that cap.
  const maxKeyRadius = keys.reduce((max, key) => Math.max(max, key.size ?? 0), 0);
  const keySize = Math.max(style.keySize, Math.ceil(maxKeyRadius * 2));
  const entries: SceneLegendEntry[] = [];
  let width = 0;
  let height = titleHeight + PADDING;
  if (style.direction === "vertical") {
    const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - keySize - style.keyGap);
    let labelWidth = 0;
    let cursorY = titleHeight;
    for (let index = 0; index < values.length; index++) {
      const fullLabel = fullLabels[index]!;
      const presented = presentedDiscreteLabel(
        fullLabel,
        maxLabelWidth,
        measurer,
        style.labelSize,
        style.appearance,
        input.scale,
      );
      const rowHeight = Math.max(LEGEND_ROW_HEIGHT, keySize, presented.height);
      labelWidth = Math.max(labelWidth, presented.width);
      const key = keys[index]!;
      const paint = input.colorOf?.(values[index]);
      entries.push({
        value: values[index],
        label: presented.label,
        fullLabel,
        ...(presented.lines !== undefined && {
          lines: presented.lines,
          lineHeight: presented.lineHeight,
        }),
        ...key,
        color: paint ?? key.color ?? UNKNOWN_COLOR,
        ...((paint !== undefined || key.color !== undefined) && { hasPaint: true }),
        x: 0,
        y: cursorY,
        ...(rowHeight !== LEGEND_ROW_HEIGHT && { height: rowHeight }),
      });
      cursorY += rowHeight + (index + 1 < values.length ? style.rowGap : 0);
    }
    const titleWidth = measurer.measureWidth(style.title, style.titleSize);
    width = Math.min(
      maxWidth,
      PADDING * 2 + Math.max(keySize + style.keyGap + Math.ceil(labelWidth), Math.ceil(titleWidth)),
    );
    height = cursorY + PADDING;
  } else {
    let cursorX = PADDING;
    let cursorY = titleHeight;
    let rowHeight = 0;
    let rowWidth = 0;
    for (let index = 0; index < values.length; index++) {
      const fullLabel = fullLabels[index]!;
      const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - keySize - style.keyGap);
      const presented = presentedDiscreteLabel(
        fullLabel,
        maxLabelWidth,
        measurer,
        style.labelSize,
        style.appearance,
        input.scale,
      );
      const entryHeight = Math.max(LEGEND_ROW_HEIGHT, keySize, presented.height);
      const itemWidth = keySize + style.keyGap + presented.width + PADDING * 2;
      const key = keys[index]!;
      const paint = input.colorOf?.(values[index]);
      if (cursorX > PADDING && cursorX + itemWidth > maxWidth) {
        cursorX = PADDING;
        cursorY += rowHeight + style.rowGap;
        rowHeight = 0;
      }
      entries.push({
        value: values[index],
        label: presented.label,
        fullLabel,
        ...(presented.lines !== undefined && {
          lines: presented.lines,
          lineHeight: presented.lineHeight,
        }),
        ...key,
        color: paint ?? key.color ?? UNKNOWN_COLOR,
        ...((paint !== undefined || key.color !== undefined) && { hasPaint: true }),
        x: cursorX - PADDING,
        y: cursorY,
        ...(entryHeight !== LEGEND_ROW_HEIGHT && { height: entryHeight }),
      });
      cursorX += itemWidth;
      rowHeight = Math.max(rowHeight, entryHeight);
      rowWidth = Math.max(rowWidth, cursorX);
    }
    width = Math.min(
      maxWidth,
      Math.max(rowWidth, measurer.measureWidth(style.title, style.titleSize) + PADDING * 2),
    );
    height = cursorY + (values.length === 0 ? 0 : rowHeight) + PADDING;
  }
  return {
    type: "discrete",
    scale: input.scale,
    aesthetics: input.aesthetics ?? [input.scale],
    interactive: input.interactive ?? true,
    title: style.title,
    position,
    direction: style.direction,
    titleSize: style.titleSize,
    titleHeight,
    labelSize: style.labelSize,
    keyGap: style.keyGap,
    x: 0,
    y: 0,
    width,
    height,
    entries,
    swatchSize: keySize,
  };
}

function rampStops(
  input: RampLegendInput,
  direction: "horizontal" | "vertical",
): [number, string][] {
  return Array.from({ length: RAMP_STOP_COUNT }, (_, index) => {
    const offset = index / (RAMP_STOP_COUNT - 1);
    return [offset, input.at(direction === "horizontal" ? offset : 1 - offset)];
  });
}

function buildRamp(
  input: RampLegendInput,
  measurer: TextMeasurer,
  maxWidth: number,
  position: "right" | "bottom",
): SceneLegend {
  const style = settings(input, position);
  const titleHeight = legendTitleHeight(style.title, style.titleSize);
  const [min, max] = input.domain;
  const tickValues = input.ticks ?? linearTicks(min, max, 5);
  const span = max - min;
  const normalized = (value: number) =>
    Math.min(1, Math.max(0, input.position?.(value) ?? (span === 0 ? 0.5 : (value - min) / span)));
  const showLabels = style.appearance?.showLabels !== false;
  const showTicks = style.appearance?.showTicks !== false;
  if (style.direction === "horizontal") {
    const buildTicks = (rampWidth: number) => {
      const tickLabelWidth = Math.max(1, rampWidth / Math.max(1, tickValues.length) - PADDING);
      return tickValues.map((value) => {
        const displayLabel = input.format(value);
        const fullLabel = input.formatFull?.(value) ?? displayLabel;
        return {
          pos: normalized(value) * rampWidth,
          label: presentedContinuousLabel({
            fullLabel: displayLabel,
            availableWidth: tickLabelWidth,
            measurer,
            fontSize: style.labelSize,
            appearance: style.appearance,
            show: showLabels,
            scale: input.scale,
          }),
          fullLabel,
        };
      });
    };
    let rampWidth = Math.min(style.rampLength, Math.max(1, maxWidth - PADDING * 2));
    let ticks = buildTicks(rampWidth);
    const labelOverhangs = () => {
      let left = 0;
      let right = 0;
      for (const tick of ticks) {
        const halfWidth = measurer.measureWidth(tick.label, style.labelSize) / 2;
        left = Math.max(left, halfWidth - tick.pos);
        right = Math.max(right, halfWidth - (rampWidth - tick.pos));
      }
      return { left, right };
    };
    let overhang = labelOverhangs();
    const containedRampWidth = Math.min(
      style.rampLength,
      Math.max(1, maxWidth - PADDING * 2 - overhang.left - overhang.right),
    );
    if (containedRampWidth !== rampWidth) {
      rampWidth = containedRampWidth;
      ticks = buildTicks(rampWidth);
      overhang = labelOverhangs();
    }
    const rampX = PADDING + overhang.left;
    return {
      type: "ramp",
      scale: input.scale,
      aesthetics: input.aesthetics ?? [input.scale],
      title: style.title,
      position,
      direction: "horizontal",
      titleSize: style.titleSize,
      titleHeight,
      labelSize: style.labelSize,
      showTicks,
      x: 0,
      y: 0,
      width: Math.min(
        maxWidth,
        Math.max(
          rampX + rampWidth + overhang.right + PADDING,
          measurer.measureWidth(style.title, style.titleSize) + PADDING * 2,
        ),
      ),
      height:
        titleHeight + style.rampThickness + (showLabels ? LEGEND_ROW_HEIGHT : 0) + PADDING * 2,
      stops: rampStops(input, "horizontal"),
      ticks,
      rampX,
      rampWidth,
      rampHeight: style.rampThickness,
    };
  }
  const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - style.rampThickness - style.keyGap);
  const ticks = tickValues.map((value) => {
    const displayLabel = input.format(value);
    const fullLabel = input.formatFull?.(value) ?? displayLabel;
    return {
      y: (1 - normalized(value)) * style.rampLength,
      label: presentedContinuousLabel({
        fullLabel: displayLabel,
        availableWidth: maxLabelWidth,
        measurer,
        fontSize: style.labelSize,
        appearance: style.appearance,
        show: showLabels,
        scale: input.scale,
      }),
      fullLabel,
    };
  });
  let labelWidth = 0;
  for (const tick of ticks)
    labelWidth = Math.max(labelWidth, measurer.measureWidth(tick.label, style.labelSize));
  return {
    type: "ramp",
    scale: input.scale,
    aesthetics: input.aesthetics ?? [input.scale],
    title: style.title,
    position,
    direction: "vertical",
    titleSize: style.titleSize,
    titleHeight,
    labelSize: style.labelSize,
    showTicks,
    x: 0,
    y: 0,
    width: Math.min(
      maxWidth,
      PADDING * 2 +
        Math.max(
          style.rampThickness + style.keyGap + labelWidth,
          measurer.measureWidth(style.title, style.titleSize),
        ),
    ),
    height: titleHeight + style.rampLength + PADDING * 2,
    stops: rampStops(input, "vertical"),
    ticks,
    rampWidth: style.rampThickness,
    rampHeight: style.rampLength,
  };
}

function buildSteps(
  input: StepsLegendInput,
  measurer: TextMeasurer,
  maxWidth: number,
  position: "right" | "bottom",
): SceneLegend {
  const style = settings(input, position);
  const titleHeight = legendTitleHeight(style.title, style.titleSize);
  const source = style.direction === "horizontal" ? [...input.entries] : input.entries.toReversed();
  const showLabels = style.appearance?.showLabels !== false;
  if (style.direction === "horizontal") {
    const stepWidth = Math.min(48, (maxWidth - PADDING * 2) / Math.max(1, source.length));
    return {
      type: "steps",
      scale: input.scale,
      aesthetics: input.aesthetics ?? [input.scale],
      title: style.title,
      position,
      direction: "horizontal",
      titleSize: style.titleSize,
      titleHeight,
      labelSize: style.labelSize,
      x: 0,
      y: 0,
      width: Math.min(
        maxWidth,
        Math.max(
          stepWidth * source.length + PADDING * 2,
          measurer.measureWidth(style.title, style.titleSize) + PADDING * 2,
        ),
      ),
      height: titleHeight + STEP_HEIGHT + (showLabels ? LEGEND_ROW_HEIGHT : 0) + PADDING * 2,
      entries: source.map((entry, index) => ({
        label: presentedContinuousLabel({
          fullLabel: entry.label,
          availableWidth: Math.max(1, stepWidth - PADDING),
          measurer,
          fontSize: style.labelSize,
          appearance: style.appearance,
          show: showLabels,
          scale: input.scale,
        }),
        fullLabel: entry.label,
        color: entry.color,
        x: index * stepWidth,
        y: 0,
      })),
      stepWidth,
      stepHeight: STEP_HEIGHT,
    };
  }
  let labelWidth = 0;
  const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - style.rampThickness - style.keyGap);
  const entries = source.map((entry, index) => {
    const label = presentedContinuousLabel({
      fullLabel: entry.label,
      availableWidth: maxLabelWidth,
      measurer,
      fontSize: style.labelSize,
      appearance: style.appearance,
      show: showLabels,
      scale: input.scale,
    });
    labelWidth = Math.max(labelWidth, measurer.measureWidth(label, style.labelSize));
    return { label, fullLabel: entry.label, color: entry.color, x: 0, y: index * STEP_HEIGHT };
  });
  return {
    type: "steps",
    scale: input.scale,
    aesthetics: input.aesthetics ?? [input.scale],
    title: style.title,
    position,
    direction: "vertical",
    titleSize: style.titleSize,
    titleHeight,
    labelSize: style.labelSize,
    x: 0,
    y: 0,
    width: Math.min(
      maxWidth,
      PADDING * 2 +
        Math.max(
          style.rampThickness + style.keyGap + labelWidth,
          measurer.measureWidth(style.title, style.titleSize),
        ),
    ),
    height: titleHeight + entries.length * STEP_HEIGHT + PADDING * 2,
    entries,
    stepWidth: style.rampThickness,
    stepHeight: STEP_HEIGHT,
  };
}

function buildForPosition(
  input: LegendInput,
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
  position: "right" | "bottom",
): SceneLegend {
  if (input.kind === "discrete") return buildDiscrete(input, order, measurer, maxWidth, position);
  if (input.kind === "steps") return buildSteps(input, measurer, maxWidth, position);
  return buildRamp(input, measurer, maxWidth, position);
}

export function assertLegendBlockFitsPlacedArea(input: {
  block: LegendBlock;
  inputs: readonly LegendInput[];
  viewportHeight: number;
  rightTop: number;
  bottomInset: number;
}): void {
  const rightExtent = input.rightTop + input.block.height;
  const bottomExtent = input.bottomInset + input.block.bottomHeight;
  for (const [position, extent] of [
    ["right", rightExtent],
    ["bottom", bottomExtent],
  ] as const) {
    if (extent <= input.viewportHeight) continue;
    const overflowing = input.block.legends.find(
      (legend) =>
        legend.position === position &&
        input.inputs.find((candidate) => candidate.scale === legend.scale)?.appearance
          ?.collision === "error",
    );
    if (overflowing === undefined) continue;
    throw new LegendLayoutError(
      overflowing.scale,
      overflowing.title,
      `The ${overflowing.scale} guide needs ${String(Math.ceil(extent))}px after placement but the viewport is ${String(Math.floor(input.viewportHeight))}px tall.`,
      "Increase the chart height, reduce the visible categories, or suppress this guide.",
    );
  }
}

export function buildLegends(
  inputs: readonly LegendInput[],
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
  viewportWidth?: number,
  viewportHeight = Number.POSITIVE_INFINITY,
): LegendBlock {
  const resolvedViewportWidth = viewportWidth ?? maxWidth / 0.35;
  let autoBottom = viewportWidth !== undefined && resolvedViewportWidth <= AUTO_BOTTOM_MAX_WIDTH;
  const build = () =>
    inputs.map((input) => {
      const position = resolvePosition(input, autoBottom);
      const available =
        position === "bottom"
          ? Math.max(48, resolvedViewportWidth - ESTIMATED_NON_LEGEND_CHROME)
          : maxWidth;
      return buildForPosition(input, order, measurer, available, position);
    });
  let legends = build();
  const tentativeRightWidth = Math.max(
    0,
    ...legends.filter((legend) => legend.position === "right").map((legend) => legend.width),
  );
  if (
    viewportWidth !== undefined &&
    !autoBottom &&
    resolvedViewportWidth - tentativeRightWidth - ESTIMATED_NON_LEGEND_CHROME < MIN_READABLE_PANEL
  ) {
    autoBottom = true;
    legends = build();
  }

  let rightY = 0;
  let bottomY = 0;
  let rightWidth = 0;
  let previousRightGap = 0;
  let previousBottomGap = 0;
  for (const legend of legends) {
    const gap =
      inputs.find((input) => input.scale === legend.scale)?.appearance?.theme?.blockGap ??
      BLOCK_GAP;
    if (legend.position === "right") {
      if (rightY > 0) rightY += previousRightGap;
      legend.y = rightY;
      rightY += legend.height;
      previousRightGap = gap;
      rightWidth = Math.max(rightWidth, legend.width);
    } else {
      if (bottomY > 0) bottomY += previousBottomGap;
      legend.y = bottomY;
      bottomY += legend.height;
      previousBottomGap = gap;
    }
  }
  for (const [position, extent] of [
    ["right", rightY],
    ["bottom", bottomY],
  ] as const) {
    if (extent <= viewportHeight) continue;
    const overflowing = legends.find(
      (legend) =>
        legend.position === position &&
        inputs.find((input) => input.scale === legend.scale)?.appearance?.collision === "error",
    );
    if (overflowing === undefined) continue;
    throw new LegendLayoutError(
      overflowing.scale,
      overflowing.title,
      `The ${overflowing.scale} guide needs ${String(Math.ceil(extent))}px but the viewport is ${String(Math.floor(viewportHeight))}px tall.`,
      "Increase the chart height, reduce the visible categories, or suppress this guide.",
    );
  }
  return {
    legends,
    width: rightWidth,
    height: rightY,
    bottomHeight: bottomY,
    autoMovedBottom:
      autoBottom &&
      inputs.some(
        (input) => input.appearance?.position === undefined || input.appearance.position === "auto",
      ),
  };
}
