/**
 * Parse and normalize agent-generated chart envelopes.
 * Shape: { spec, interactions?, title? }
 */

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

function aesHasDiscreteLegendChannel(aes: unknown): boolean {
  if (aes === null || typeof aes !== "object" || Array.isArray(aes)) {
    return false;
  }
  const a = aes as Record<string, unknown>;
  for (const channel of ["color", "fill", "colour"] as const) {
    const mapping = a[channel];
    if (
      mapping !== null &&
      typeof mapping === "object" &&
      !Array.isArray(mapping) &&
      "field" in mapping
    ) {
      return true;
    }
    if (typeof mapping === "string" && mapping.length > 0) return true;
  }
  return false;
}

/** Whether the chart appears to carry a discrete color/fill legend channel. */
export function chartHasDiscreteLegend(spec: unknown): boolean {
  if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
    return false;
  }
  const record = spec as Record<string, unknown>;
  if (aesHasDiscreteLegendChannel(record.aes)) return true;
  const layers = record.layers;
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      if (
        layer !== null &&
        typeof layer === "object" &&
        aesHasDiscreteLegendChannel((layer as Record<string, unknown>).aes)
      ) {
        return true;
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
