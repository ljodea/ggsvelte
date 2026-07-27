/** Discrete (categorical) legend scene builder. */
import type { TextMeasurer } from "./layout/measure.js";
import { DEFAULT_MISSING_COLOR } from "./scales/engine.js";
import { encodeKey } from "./scales/state.js";
import { bandKey } from "./scales/train.js";
import type { SceneLegend, SceneLegendEntry } from "./scene.js";
import {
  disambiguatedLabels,
  LEGEND_ROW_HEIGHT,
  legendTitleHeight,
  PADDING,
  presentedDiscreteLabel,
  settings,
} from "./legend-build-shared.js";
import type { DiscreteLegendInput, LegendOrder } from "./legend-build-types.js";

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
