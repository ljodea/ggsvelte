/** Discrete (categorical) legend scene builder. */
import type { TextMeasurer } from "./layout/measure.js";
import { DEFAULT_MISSING_COLOR } from "./scales/engine.js";
import { encodeKey } from "./scales/state.js";
import { bandKey } from "./scales/train.js";
import type { SceneLegend, SceneLegendEntry } from "./scene.js";
import { disambiguatedLabels } from "./domain-labels.js";
import {
  LEGEND_ROW_HEIGHT,
  legendTitleHeight,
  PADDING,
  presentedDiscreteLabel,
  settings,
} from "./legend-build-shared.js";
import type { DiscreteLegendInput, LegendKeyStyle, LegendOrder } from "./legend-build-types.js";

const UNKNOWN_COLOR = DEFAULT_MISSING_COLOR;

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

function discreteEntry(input: {
  value: unknown;
  fullLabel: string;
  presented: ReturnType<typeof presentedDiscreteLabel>;
  key: LegendKeyStyle;
  paint: string | undefined;
  x: number;
  y: number;
  height: number;
}): SceneLegendEntry {
  const { value, fullLabel, presented, key, paint, x, y, height } = input;
  return {
    value,
    label: presented.label,
    fullLabel,
    ...(presented.lines !== undefined && {
      lines: presented.lines,
      lineHeight: presented.lineHeight,
    }),
    ...key,
    color: paint ?? key.color ?? UNKNOWN_COLOR,
    ...((paint !== undefined || key.color !== undefined) && { hasPaint: true }),
    x,
    y,
    ...(height !== LEGEND_ROW_HEIGHT && { height }),
  };
}

function buildVerticalDiscrete(input: {
  source: DiscreteLegendInput;
  values: unknown[];
  fullLabels: string[];
  keys: LegendKeyStyle[];
  style: ReturnType<typeof settings>;
  measurer: TextMeasurer;
  maxWidth: number;
  titleHeight: number;
  keySize: number;
}): { entries: SceneLegendEntry[]; width: number; height: number } {
  const { source, values, fullLabels, keys, style, measurer, maxWidth, titleHeight, keySize } =
    input;
  const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - keySize - style.keyGap);
  const entries: SceneLegendEntry[] = [];
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
      source.scale,
    );
    const rowHeight = Math.max(LEGEND_ROW_HEIGHT, keySize, presented.height);
    labelWidth = Math.max(labelWidth, presented.width);
    entries.push(
      discreteEntry({
        value: values[index],
        fullLabel,
        presented,
        key: keys[index]!,
        paint: source.colorOf?.(values[index]),
        x: 0,
        y: cursorY,
        height: rowHeight,
      }),
    );
    cursorY += rowHeight + (index + 1 < values.length ? style.rowGap : 0);
  }
  const titleWidth = measurer.measureWidth(style.title, style.titleSize);
  return {
    entries,
    width: Math.min(
      maxWidth,
      PADDING * 2 + Math.max(keySize + style.keyGap + Math.ceil(labelWidth), Math.ceil(titleWidth)),
    ),
    height: cursorY + PADDING,
  };
}

function buildHorizontalDiscrete(input: {
  source: DiscreteLegendInput;
  values: unknown[];
  fullLabels: string[];
  keys: LegendKeyStyle[];
  style: ReturnType<typeof settings>;
  measurer: TextMeasurer;
  maxWidth: number;
  titleHeight: number;
  keySize: number;
}): { entries: SceneLegendEntry[]; width: number; height: number } {
  const { source, values, fullLabels, keys, style, measurer, maxWidth, titleHeight, keySize } =
    input;
  const entries: SceneLegendEntry[] = [];
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
      source.scale,
    );
    const entryHeight = Math.max(LEGEND_ROW_HEIGHT, keySize, presented.height);
    const itemWidth = keySize + style.keyGap + presented.width + PADDING * 2;
    if (cursorX > PADDING && cursorX + itemWidth > maxWidth) {
      cursorX = PADDING;
      cursorY += rowHeight + style.rowGap;
      rowHeight = 0;
    }
    entries.push(
      discreteEntry({
        value: values[index],
        fullLabel,
        presented,
        key: keys[index]!,
        paint: source.colorOf?.(values[index]),
        x: cursorX - PADDING,
        y: cursorY,
        height: entryHeight,
      }),
    );
    cursorX += itemWidth;
    rowHeight = Math.max(rowHeight, entryHeight);
    rowWidth = Math.max(rowWidth, cursorX);
  }
  return {
    entries,
    width: Math.min(
      maxWidth,
      Math.max(rowWidth, measurer.measureWidth(style.title, style.titleSize) + PADDING * 2),
    ),
    height: cursorY + (values.length === 0 ? 0 : rowHeight) + PADDING,
  };
}

export function buildDiscrete(
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
  const layout = (style.direction === "vertical" ? buildVerticalDiscrete : buildHorizontalDiscrete)(
    {
      source: input,
      values,
      fullLabels,
      keys,
      style,
      measurer,
      maxWidth,
      titleHeight,
      keySize,
    },
  );
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
    width: layout.width,
    height: layout.height,
    entries: layout.entries,
    swatchSize: keySize,
  };
}
