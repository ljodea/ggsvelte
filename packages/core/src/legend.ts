/**
 * Legend construction (plan: legends are Scene objects produced by the same
 * pipeline, placed by the two-pass layout, styled ONLY through the theme —
 * Hadley lesson 6: one styling path).
 *
 * The pipeline measures legends BEFORE the two-pass layout and passes their
 * width as a reserved right margin, so tick derivation sees the true panel
 * width. Ordering (`legend.order`) reorders entries only — color assignments
 * NEVER change with order (scale-stability contract).
 */
import { linearTicks, tickStep } from "./layout/ticks.js";
import type { TextMeasurer } from "./layout/measure.js";
import { bandKey } from "./scales/train.js";
import type { SceneLegend, SceneLegendEntry } from "./scene.js";

export type LegendOrder = "stable-domain" | "present-first-seen" | "sorted";

export interface DiscreteLegendInput {
  kind: "discrete";
  scale: "color" | "fill";
  title: string;
  /** Values in stable assignment order (the default legend order). */
  domain: readonly unknown[];
  /** Values in first-occurrence order of the CURRENT data. */
  firstSeen: readonly unknown[];
  colorOf(value: unknown): string | undefined;
}

export interface RampLegendInput {
  kind: "ramp";
  scale: "color" | "fill";
  title: string;
  domain: [number, number];
  /** Ramp color at t in [0, 1]. */
  at(t: number): string;
  /** Tick label formatter. */
  format(value: number): string;
}

export type LegendInput = DiscreteLegendInput | RampLegendInput;

// Layout constants (themable via CSS at render time; measured with the
// canonical measurer so reserved margins are deterministic).
const FONT_SIZE = 11;
const TITLE_HEIGHT = 18;
const ROW_HEIGHT = 18;
const SWATCH_SIZE = 10;
const SWATCH_GAP = 6;
const PADDING = 4;
const BLOCK_GAP = 12;
const RAMP_WIDTH = 12;
const RAMP_HEIGHT = 96;
const RAMP_STOP_COUNT = 10;
const UNKNOWN_COLOR = "#999999";

export interface LegendBlock {
  legends: SceneLegend[];
  /** Total width of the legend column (0 = no legends). */
  width: number;
  height: number;
}

function orderedValues(input: DiscreteLegendInput, order: LegendOrder): unknown[] {
  switch (order) {
    case "present-first-seen": {
      const seen = new Set<string>();
      const out: unknown[] = [];
      for (const v of input.firstSeen) {
        const key = bandKey(v);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(v);
      }
      return out;
    }
    case "sorted":
      return [...input.domain].toSorted((a, b) => bandKey(a).localeCompare(bandKey(b), "en"));
    default:
      return [...input.domain];
  }
}

function truncate(label: string, maxWidth: number, measurer: TextMeasurer): string {
  if (measurer.measureWidth(label, FONT_SIZE) <= maxWidth) return label;
  // oxlint-disable-next-line typescript/no-misused-spread -- code-point split is intentional
  const chars = [...label];
  for (let keep = chars.length - 1; keep >= 1; keep--) {
    const candidate = chars.slice(0, keep).join("") + "…";
    if (measurer.measureWidth(candidate, FONT_SIZE) <= maxWidth) return candidate;
  }
  return "…";
}

/**
 * Build and vertically stack legend boxes at x=0 (the pipeline shifts them to
 * their final plot position after layout). `maxWidth` caps the block; labels
 * truncate with an ellipsis beyond it.
 */
export function buildLegends(
  inputs: readonly LegendInput[],
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
): LegendBlock {
  const legends: SceneLegend[] = [];
  let y = 0;
  let width = 0;

  for (const input of inputs) {
    if (input.kind === "discrete") {
      const values = orderedValues(input, order);
      const titleHeight = input.title === "" ? 0 : TITLE_HEIGHT;
      const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - SWATCH_SIZE - SWATCH_GAP);
      const entries: SceneLegendEntry[] = [];
      let labelWidth = 0;
      for (let i = 0; i < values.length; i++) {
        const label = truncate(bandKey(values[i]), maxLabelWidth, measurer);
        labelWidth = Math.max(labelWidth, measurer.measureWidth(label, FONT_SIZE));
        entries.push({
          value: values[i],
          label,
          color: input.colorOf(values[i]) ?? UNKNOWN_COLOR,
          y: titleHeight + i * ROW_HEIGHT,
        });
      }
      const titleWidth =
        input.title === ""
          ? 0
          : Math.min(measurer.measureWidth(input.title, FONT_SIZE), maxWidth - PADDING * 2);
      const boxWidth =
        PADDING * 2 +
        Math.max(SWATCH_SIZE + SWATCH_GAP + Math.ceil(labelWidth), Math.ceil(titleWidth));
      const boxHeight = titleHeight + entries.length * ROW_HEIGHT + PADDING;
      legends.push({
        type: "discrete",
        scale: input.scale,
        title: input.title,
        x: 0,
        y,
        width: boxWidth,
        height: boxHeight,
        entries,
        swatchSize: SWATCH_SIZE,
      });
      width = Math.max(width, boxWidth);
      y += boxHeight + BLOCK_GAP;
      continue;
    }
    {
      const titleHeight = input.title === "" ? 0 : TITLE_HEIGHT;
      const [min, max] = input.domain;
      const tickValues = linearTicks(min, max, 5);
      const step = min === max ? 0 : tickStep(min, max, 5);
      void step;
      const span = max - min;
      const ticks = tickValues.map((v) => ({
        y: span === 0 ? RAMP_HEIGHT / 2 : RAMP_HEIGHT - ((v - min) / span) * RAMP_HEIGHT,
        label: input.format(v),
      }));
      let labelWidth = 0;
      for (const t of ticks) {
        labelWidth = Math.max(labelWidth, measurer.measureWidth(t.label, FONT_SIZE));
      }
      const titleWidth =
        input.title === ""
          ? 0
          : Math.min(measurer.measureWidth(input.title, FONT_SIZE), maxWidth - PADDING * 2);
      const stops: [number, string][] = [];
      for (let i = 0; i < RAMP_STOP_COUNT; i++) {
        const offset = i / (RAMP_STOP_COUNT - 1);
        stops.push([offset, input.at(1 - offset)]);
      }
      const boxWidth =
        PADDING * 2 +
        Math.max(RAMP_WIDTH + SWATCH_GAP + Math.ceil(labelWidth), Math.ceil(titleWidth));
      const boxHeight = titleHeight + RAMP_HEIGHT + PADDING * 2;
      legends.push({
        type: "ramp",
        scale: input.scale,
        title: input.title,
        x: 0,
        y,
        width: boxWidth,
        height: boxHeight,
        stops,
        ticks,
        rampWidth: RAMP_WIDTH,
        rampHeight: RAMP_HEIGHT,
      });
      width = Math.max(width, boxWidth);
      y += boxHeight + BLOCK_GAP;
    }
  }

  return {
    legends,
    width,
    height: legends.length === 0 ? 0 : y - BLOCK_GAP,
  };
}
