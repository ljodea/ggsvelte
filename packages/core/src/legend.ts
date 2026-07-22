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
import { truncateToFit } from "./layout/truncate.js";
import { encodeKey } from "./scales/state.js";
import { bandKey } from "./scales/train.js";
import type { Linetype, PointShape } from "./scales/style.js";
import type { SceneLegend, SceneLegendEntry } from "./scene.js";
import type { StyleAesthetic } from "@ggsvelte/spec";

export type LegendOrder = "stable-domain" | "present-first-seen" | "sorted";

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
  title: string;
  /** Values in stable assignment order (the default legend order). */
  domain: readonly unknown[];
  /** Values in first-occurrence order of the CURRENT data. */
  firstSeen: readonly unknown[];
  /** Whether entries have exact raw-value identity for focus/filter interactions. */
  interactive?: boolean;
  colorOf?(value: unknown): string | undefined;
  keyOf?(value: unknown): LegendKeyStyle;
  labelOf?(value: unknown): string;
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
  /** Optional semantic tick positions; numeric ramps use linear ticks. */
  ticks?: readonly number[];
  /** Map a semantic tick value to its normalized position on the trained ramp. */
  position?: (value: number) => number;
}

export interface StepsLegendInput {
  kind: "steps";
  scale: "color" | "fill";
  title: string;
  entries: readonly Readonly<{ label: string; color: string }>[];
}

export type LegendInput = DiscreteLegendInput | RampLegendInput | StepsLegendInput;

// Layout constants (themable via CSS at render time; measured with the
// canonical measurer so reserved margins are deterministic).
const FONT_SIZE = 11;
const TITLE_HEIGHT = 18;
/** Discrete legend row height; also the WCAG 2.2 minimum pointer target. */
export const LEGEND_ROW_HEIGHT = 24;
const SWATCH_SIZE = 10;
const SWATCH_GAP = 6;
const PADDING = 4;
const BLOCK_GAP = 12;
const RAMP_WIDTH = 12;
const RAMP_HEIGHT = 96;
const RAMP_STOP_COUNT = 10;
const STEP_HEIGHT = 24;
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
      // Dedupe by typed identity, not presentation label: the ordinal scale
      // gives 1 and "1" distinct assignments, so both must appear.
      const domainKeys = new Set(input.domain.map((value) => encodeKey(value)));
      const seen = new Set<string>();
      const out: unknown[] = [];
      for (const v of input.firstSeen) {
        const key = encodeKey(v);
        if (!domainKeys.has(key) || seen.has(key)) continue;
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

function valueKind(value: unknown): string {
  if (value instanceof Date) return "date";
  if (value === null) return "null";
  if (typeof value === "string") return "text";
  return typeof value;
}

/**
 * Presentation labels for discrete values, with a typed qualifier appended
 * to any label shared by more than one typed value (`1` and `"1"` both
 * render as "1"): the qualifier is the only way — visually and for
 * accessible names — to tell the entries apart. Shared by legends and the
 * precise-bounds category selects.
 */
export function disambiguatedLabels(values: readonly unknown[]): string[] {
  const raw = values.map((value) => bandKey(value));
  const counts = new Map<string, number>();
  for (const label of raw) counts.set(label, (counts.get(label) ?? 0) + 1);
  return raw.map((label, index) =>
    (counts.get(label) ?? 0) > 1 ? `${label} (${valueKind(values[index])})` : label,
  );
}

/** Ellipsis for legend entry truncation (same glyph as axis truncateToFit paths). */
const LEGEND_ELLIPSIS = "…";

/**
 * Truncate a legend entry label to `maxWidth` via shared binary-search
 * {@link truncateToFit}: O(log L) measureWidth calls (and O(L log L) string work)
 * instead of a reverse linear scan O(L) measures / O(L²) joins.
 *
 * The pipeline's MetricsTableMeasurer is monotonic in keep length; under a
 * non-monotonic native measurer this is best-effort (same contract as axes).
 */
function truncate(label: string, maxWidth: number, measurer: TextMeasurer): string {
  return truncateToFit(label, maxWidth, measurer, FONT_SIZE, LEGEND_ELLIPSIS);
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
      const displayLabels =
        input.labelOf === undefined
          ? disambiguatedLabels(values)
          : values.map((value) => input.labelOf?.(value) ?? "");
      const titleHeight = input.title === "" ? 0 : TITLE_HEIGHT;
      const keys = values.map((value) => input.keyOf?.(value) ?? {});
      // Grow the swatch so the largest size key renders at its true radius.
      // Both renderers cap a size/shape key at swatchSize/2, so a fixed 10px
      // swatch collapses every radius above 5px to an identical dot. Size keys
      // reach 9px under the default range, so distinct large keys would
      // otherwise look the same while the plotted marks differ. Sizing the
      // swatch from the largest key makes the caps non-binding in both the pure
      // SVG and Svelte renderers (they derive layout from swatchSize).
      const maxKeyRadius = keys.reduce((max, key) => Math.max(max, key.size ?? 0), 0);
      const swatchSize = Math.max(SWATCH_SIZE, Math.ceil(maxKeyRadius * 2));
      const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - swatchSize - SWATCH_GAP);
      const entries: SceneLegendEntry[] = [];
      let labelWidth = 0;
      for (let i = 0; i < values.length; i++) {
        const label = truncate(displayLabels[i]!, maxLabelWidth, measurer);
        labelWidth = Math.max(labelWidth, measurer.measureWidth(label, FONT_SIZE));
        const key = keys[i]!;
        entries.push({
          value: values[i],
          label,
          color: key.color ?? input.colorOf?.(values[i]) ?? UNKNOWN_COLOR,
          ...(key.size !== undefined && { size: key.size }),
          ...(key.linewidth !== undefined && { linewidth: key.linewidth }),
          ...(key.alpha !== undefined && { alpha: key.alpha }),
          ...(key.shape !== undefined && { shape: key.shape }),
          ...(key.linetype !== undefined && { linetype: key.linetype }),
          y: titleHeight + i * LEGEND_ROW_HEIGHT,
        });
      }
      const titleWidth =
        input.title === ""
          ? 0
          : Math.min(measurer.measureWidth(input.title, FONT_SIZE), maxWidth - PADDING * 2);
      const boxWidth =
        PADDING * 2 +
        Math.max(swatchSize + SWATCH_GAP + Math.ceil(labelWidth), Math.ceil(titleWidth));
      const boxHeight = titleHeight + entries.length * LEGEND_ROW_HEIGHT + PADDING;
      legends.push({
        type: "discrete",
        scale: input.scale,
        interactive: input.interactive ?? true,
        title: input.title,
        x: 0,
        y,
        width: boxWidth,
        height: boxHeight,
        entries,
        swatchSize,
      });
      width = Math.max(width, boxWidth);
      y += boxHeight + BLOCK_GAP;
      continue;
    }
    if (input.kind === "steps") {
      const titleHeight = input.title === "" ? 0 : TITLE_HEIGHT;
      let labelWidth = 0;
      const maxLabelWidth = Math.max(1, maxWidth - PADDING * 2 - RAMP_WIDTH - SWATCH_GAP);
      const entries = input.entries.toReversed().map((entry, index) => {
        const label = truncate(entry.label, maxLabelWidth, measurer);
        labelWidth = Math.max(labelWidth, measurer.measureWidth(label, FONT_SIZE));
        return { label, color: entry.color, y: index * STEP_HEIGHT };
      });
      const titleWidth =
        input.title === ""
          ? 0
          : Math.min(measurer.measureWidth(input.title, FONT_SIZE), maxWidth - PADDING * 2);
      const boxWidth =
        PADDING * 2 +
        Math.max(RAMP_WIDTH + SWATCH_GAP + Math.ceil(labelWidth), Math.ceil(titleWidth));
      const boxHeight = titleHeight + entries.length * STEP_HEIGHT + PADDING * 2;
      legends.push({
        type: "steps",
        scale: input.scale,
        title: input.title,
        x: 0,
        y,
        width: boxWidth,
        height: boxHeight,
        entries,
        stepWidth: RAMP_WIDTH,
        stepHeight: STEP_HEIGHT,
      });
      width = Math.max(width, boxWidth);
      y += boxHeight + BLOCK_GAP;
      continue;
    }
    {
      const titleHeight = input.title === "" ? 0 : TITLE_HEIGHT;
      const [min, max] = input.domain;
      const tickValues = input.ticks ?? linearTicks(min, max, 5);
      const step = min === max ? 0 : tickStep(min, max, 5);
      void step;
      const span = max - min;
      const ticks = tickValues.map((v) => {
        const position = input.position?.(v) ?? (span === 0 ? 0.5 : (v - min) / span);
        return {
          y: RAMP_HEIGHT - Math.min(1, Math.max(0, position)) * RAMP_HEIGHT,
          label: input.format(v),
        };
      });
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
