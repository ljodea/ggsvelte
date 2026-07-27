/** Continuous color guide builders: ramp (colorbar) and steps. */
import type { TextMeasurer } from "./layout/measure.js";
import { linearTicks } from "./layout/ticks.js";
import type { SceneLegend } from "./scene.js";
import {
  LEGEND_ROW_HEIGHT,
  legendTitleHeight,
  PADDING,
  presentedContinuousLabel,
  settings,
} from "./legend-build-shared.js";
import type { RampLegendInput, StepsLegendInput } from "./legend-build-types.js";

const RAMP_STOP_COUNT = 10;
const STEP_HEIGHT = 24;

function rampStops(
  input: RampLegendInput,
  direction: "horizontal" | "vertical",
): [number, string][] {
  return Array.from({ length: RAMP_STOP_COUNT }, (_, index) => {
    const offset = index / (RAMP_STOP_COUNT - 1);
    return [offset, input.at(direction === "horizontal" ? offset : 1 - offset)];
  });
}

export function buildRamp(
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

export function buildSteps(
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
