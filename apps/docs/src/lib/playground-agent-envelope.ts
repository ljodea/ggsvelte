/**
 * Parse and normalize agent-generated chart envelopes.
 * Shape: { spec, interactions?, title? }
 */

import { discretenessOf, inferFieldType, type CellValue } from "@ggsvelte/core";
import { configuredColorScaleType } from "@ggsvelte/spec";

export interface PlaygroundInteractions {
  readonly inspect: boolean;
  readonly select: false | "point" | "interval";
  readonly zoom: boolean;
  readonly legendFilter: boolean;
  readonly legendFocus: boolean;
}

export interface PlaygroundAgentEnvelope {
  readonly spec: unknown;
  readonly interactions: PlaygroundInteractions;
  readonly title: string | null;
}

export type ParseEnvelopeResult =
  | { readonly ok: true; readonly envelope: PlaygroundAgentEnvelope }
  | { readonly ok: false; readonly message: string };

export const PLAYGROUND_MAX_TITLE_LENGTH = 120;

export function defaultPlaygroundInteractions(): PlaygroundInteractions {
  return {
    inspect: true,
    select: false,
    zoom: false,
    legendFilter: false,
    legendFocus: false,
  };
}

/**
 * Locked interaction matrix:
 * - inspect always available
 * - select is point XOR interval
 * - zoom is mutually exclusive with interval select (both use brush)
 * - legendFilter / legendFocus only when discrete legend is present (caller gates UI)
 */
export function normalizePlaygroundInteractions(raw: unknown): PlaygroundInteractions {
  const defaults = defaultPlaygroundInteractions();
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }
  const input = raw as Record<string, unknown>;

  const inspect = input.inspect !== false;

  let select: false | "point" | "interval" = false;
  if (input.select === "point" || input.select === "interval") {
    select = input.select;
  } else if (input.select === true) {
    select = "point";
  }

  let zoom = input.zoom === true;
  // Interval select and zoom both use brush — interval wins.
  if (select === "interval" && zoom) {
    zoom = false;
  }

  const legendFilter = input.legendFilter === true;
  const legendFocus = input.legendFocus === true;

  return { inspect, select, zoom, legendFilter, legendFocus };
}

export function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```\s*$/u.exec(trimmed);
  if (fenced?.[1] !== undefined) return fenced[1].trim();
  return trimmed;
}

function normalizeTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Plain text only — strip control chars and cap length.
  const cleaned = raw
    // oxlint-disable-next-line no-control-regex -- stripping control chars is the point
    .replaceAll(/[\u0000-\u001F\u007F]/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
  if (cleaned === "") return null;
  return cleaned.length > PLAYGROUND_MAX_TITLE_LENGTH
    ? cleaned.slice(0, PLAYGROUND_MAX_TITLE_LENGTH)
    : cleaned;
}

export function parsePlaygroundAgentEnvelope(input: unknown): ParseEnvelopeResult {
  let value = input;
  if (typeof value === "string") {
    const stripped = stripMarkdownFences(value);
    try {
      value = JSON.parse(stripped) as unknown;
    } catch {
      // Model returned non-JSON (e.g. Svelte source) — fail closed.
      if (stripped.includes("<GGPlot") || stripped.includes("import {")) {
        return {
          ok: false,
          message: "Expected a JSON envelope, not Svelte or TypeScript source.",
        };
      }
      return { ok: false, message: "Response is not valid JSON." };
    }
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: "Envelope must be a JSON object." };
  }

  const record = value as Record<string, unknown>;
  if (!("spec" in record) || record.spec === undefined) {
    // Allow bare PortableSpec as a lenient fallback only when it looks like one.
    if ("layers" in record && "data" in record) {
      return {
        ok: true,
        envelope: {
          spec: record,
          interactions: defaultPlaygroundInteractions(),
          title: null,
        },
      };
    }
    return { ok: false, message: 'Envelope must include a "spec" field.' };
  }

  return {
    ok: true,
    envelope: {
      spec: record.spec,
      interactions: normalizePlaygroundInteractions(record.interactions),
      title: normalizeTitle(record.title),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const COLOR_CHANNELS = ["color", "fill", "colour"] as const;
type ColorChannel = (typeof COLOR_CHANNELS)[number];

/** Families that draw a keyed legend; `sequential`/`binned` draw a ramp/steps. */
const DISCRETE_COLOR_FAMILIES: ReadonlySet<string> = new Set(["ordinal", "manual", "identity"]);

/**
 * Field a color channel maps to, or null for constants (`{value}`) and absent
 * channels. Bare strings are not valid channel values, but models emit them,
 * so they are read leniently as field names.
 */
function colorChannelField(aes: unknown, channel: ColorChannel): string | null {
  if (!isRecord(aes)) return null;
  const mapping = aes[channel];
  if (isRecord(mapping) && typeof mapping.field === "string" && mapping.field !== "") {
    return mapping.field;
  }
  if (typeof mapping === "string" && mapping !== "") return mapping;
  return null;
}

/** One column's cells from inline rows or inline columns; null when absent. */
function columnValues(data: unknown, field: string): CellValue[] | null {
  if (!isRecord(data)) return null;
  const rows = data.values;
  if (Array.isArray(rows)) {
    const column: CellValue[] = [];
    for (const row of rows) {
      if (isRecord(row) && field in row) column.push(row[field] as CellValue);
    }
    return column.length > 0 ? column : null;
  }
  const columns = data.columns;
  if (isRecord(columns) && Array.isArray(columns[field])) {
    const column = columns[field] as CellValue[];
    return column.length > 0 ? column : null;
  }
  return null;
}

/**
 * Whether one color channel resolves to a discrete legend, mirroring the
 * pipeline: an authored family wins, otherwise the field's inferred type
 * decides (quantitative and temporal fields train a continuous ramp).
 */
function channelDrawsDiscreteLegend(
  spec: Record<string, unknown>,
  layerData: unknown,
  aes: unknown,
  channel: ColorChannel,
): boolean {
  const field = colorChannelField(aes, channel);
  if (field === null) return false;

  const scales = spec.scales;
  const config = isRecord(scales) ? scales[channel === "colour" ? "color" : channel] : undefined;
  const family = configuredColorScaleType(isRecord(config) ? config : undefined);
  if (family !== undefined) return DISCRETE_COLOR_FAMILIES.has(family);

  const column = columnValues(layerData, field) ?? columnValues(spec.data, field);
  // Named or absent data: the runtime may still draw a keyed legend, so keep
  // the affordance rather than silently dropping it.
  if (column === null) return true;
  return discretenessOf(inferFieldType(column)) === "discrete";
}

/**
 * Whether the chart draws a discrete color/fill legend — the only kind that
 * can be filtered or focused. Field presence alone is not enough: a
 * quantitative field renders a colorbar with no keys to click (#697).
 */
export function chartHasDiscreteLegend(spec: unknown): boolean {
  if (!isRecord(spec)) return false;
  for (const channel of COLOR_CHANNELS) {
    if (channelDrawsDiscreteLegend(spec, spec.data, spec.aes, channel)) return true;
  }
  const layers = spec.layers;
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      if (!isRecord(layer)) continue;
      for (const channel of COLOR_CHANNELS) {
        if (channelDrawsDiscreteLegend(spec, layer.data ?? spec.data, layer.aes, channel)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Apply capability matrix constraints when the chart has no discrete legend,
 * or when interval/zoom conflict.
 */
export function coerceInteractionsForChart(
  interactions: PlaygroundInteractions,
  hasDiscreteLegend: boolean,
): PlaygroundInteractions {
  let next = normalizePlaygroundInteractions(interactions);
  if (!hasDiscreteLegend) {
    next = { ...next, legendFilter: false, legendFocus: false };
  }
  return next;
}

/** Invitation line under the chart title based on enabled capabilities. */
export function interactionInvitationLine(interactions: PlaygroundInteractions): string {
  const parts: string[] = [];
  if (interactions.inspect) parts.push("Hover points for details");
  if (interactions.select === "point") parts.push("click to select");
  if (interactions.select === "interval") parts.push("drag to select");
  if (interactions.zoom) parts.push("brush to zoom");
  if (interactions.legendFilter) parts.push("use the legend to filter");
  if (interactions.legendFocus) parts.push("use the legend to focus");
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${parts[0]}.`;
  const head = parts.slice(0, -1).join(" · ");
  return `${head} · ${parts.at(-1)}.`;
}
