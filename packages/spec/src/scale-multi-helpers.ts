/**
 * Multi-aesthetic scale helpers (#833) — ggplot2 scale_*_identity /
 * scale_discrete_manual ergonomics over PortableSpec's per-channel `scales`.
 *
 * Helpers expand to a `Scales` object with the same config on each requested
 * aesthetic (British "colour" → "color"). No new PortableSpec branch: the
 * expanded object is what normalize/validate already understand.
 *
 * `scaleType` is a small registry for agent/tooling default selection — not
 * an R S3 generic.
 */

import type { CellValue, Scales } from "./schema.js";
import type { ProfileFieldType } from "./validate-data.js";

/** Aesthetics accepted by multi-aes identity/manual helpers (not x/y). */
export type MultiScaleAesthetic =
  | "color"
  | "colour"
  | "fill"
  | "size"
  | "linewidth"
  | "alpha"
  | "shape"
  | "linetype";

/** Canonical Scales keys for multi-aes helpers. */
export type MultiScaleChannel = Exclude<keyof Scales, "x" | "y">;

const MULTI_AES = new Set<string>([
  "color",
  "colour",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "shape",
  "linetype",
]);

const CONTINUOUS_IDENTITY_AES = new Set<MultiScaleChannel>([
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
]);

const DISCRETE_IDENTITY_AES = new Set<MultiScaleChannel>([
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "shape",
  "linetype",
]);

export function canonicalMultiScaleChannel(aesthetic: MultiScaleAesthetic): MultiScaleChannel {
  if (aesthetic === "colour") return "color";
  return aesthetic;
}

function assertAesthetics(
  aesthetics: readonly MultiScaleAesthetic[],
  allowed: ReadonlySet<MultiScaleChannel>,
  kind: string,
): MultiScaleChannel[] {
  if (aesthetics.length === 0) {
    throw new Error(`${kind}: aesthetics must be a non-empty array.`);
  }
  const channels: MultiScaleChannel[] = [];
  const seen = new Set<MultiScaleChannel>();
  for (const raw of aesthetics) {
    if (!MULTI_AES.has(raw)) {
      throw new Error(
        `${kind}: unsupported aesthetic "${raw}". Expected one of: color, colour, fill, size, linewidth, alpha, shape, linetype.`,
      );
    }
    const channel = canonicalMultiScaleChannel(raw);
    if (!allowed.has(channel)) {
      throw new Error(
        `${kind}: aesthetic "${raw}" is not valid for this helper (resolved channel "${channel}").`,
      );
    }
    if (seen.has(channel)) continue;
    seen.add(channel);
    channels.push(channel);
  }
  return channels;
}

export type MultiIdentityScaleOptions = {
  /** Target aesthetics; British "colour" is an alias of "color". */
  aesthetics: readonly MultiScaleAesthetic[];
};

export type MultiManualScaleOptions = {
  aesthetics: readonly MultiScaleAesthetic[];
  /** Positional range values applied to every listed aesthetic. */
  values: readonly (string | number)[];
  domain?: readonly CellValue[];
};

/**
 * Build a Scales bag by assigning the same JSON config to each channel.
 * Deep-clone so nested range/domain arrays are not shared across channels
 * (shallow `{ ...entry }` would alias them — mutating one channel mutates all).
 * Channel-specific Output types differ (colors vs numbers vs symbols); callers
 * and tier-1 validation own value/channel compatibility.
 */
function cloneScaleEntry(entry: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...entry };
  const range = copy["range"];
  if (Array.isArray(range)) copy["range"] = range.slice();
  const domain = copy["domain"];
  if (Array.isArray(domain)) copy["domain"] = domain.slice();
  return copy;
}

function assignChannels(
  channels: readonly MultiScaleChannel[],
  entry: Record<string, unknown>,
): Scales {
  const scales: Partial<Record<MultiScaleChannel, unknown>> = {};
  for (const channel of channels) {
    scales[channel] = cloneScaleEntry(entry);
  }
  return scales;
}

/**
 * Apply an identity scale to every listed continuous-friendly aesthetic
 * (color/fill/size/linewidth/alpha). Shape/linetype are rejected.
 */
export function scaleContinuousIdentity(options: MultiIdentityScaleOptions): Scales {
  const channels = assertAesthetics(
    options.aesthetics,
    CONTINUOUS_IDENTITY_AES,
    "scaleContinuousIdentity",
  );
  return assignChannels(channels, { type: "identity" });
}

/**
 * Apply an identity scale to every listed discrete-capable aesthetic
 * (including shape/linetype).
 */
export function scaleDiscreteIdentity(options: MultiIdentityScaleOptions): Scales {
  const channels = assertAesthetics(
    options.aesthetics,
    DISCRETE_IDENTITY_AES,
    "scaleDiscreteIdentity",
  );
  return assignChannels(channels, { type: "identity" });
}

/**
 * Apply the same manual domain/range mapping to every listed aesthetic.
 * Callers must ensure `values` match each channel's output type (CSS colors
 * for color/fill, numbers for size/alpha/linewidth, named tokens for
 * shape/linetype) — tier-1 validation enforces that on the full plot.
 */
export function scaleDiscreteManual(options: MultiManualScaleOptions): Scales {
  if (options.values.length === 0) {
    throw new Error("scaleDiscreteManual: values must be a non-empty array.");
  }
  const channels = assertAesthetics(
    options.aesthetics,
    DISCRETE_IDENTITY_AES,
    "scaleDiscreteManual",
  );
  const entry: Record<string, unknown> = {
    type: "manual",
    range: [...options.values],
  };
  if (options.domain !== undefined) {
    entry["domain"] = [...options.domain];
  }
  return assignChannels(channels, entry);
}

export const scale_continuous_identity = scaleContinuousIdentity;
export const scale_discrete_identity = scaleDiscreteIdentity;
export const scale_discrete_manual = scaleDiscreteManual;

// --- scale_type registry (agent/tooling default selection) -------------------

export type ScaleTypeAesthetic = MultiScaleAesthetic | "x" | "y";

/**
 * Recommended PortableSpec scale family for an aesthetic + data kind.
 * Not a full ggplot2 `scale_type` S3 registry — a small deterministic map for
 * generators and repair tools.
 */
export type RecommendedScaleType = "linear" | "band" | "ordinal" | "sequential" | "identity";

export function scaleType(query: {
  aesthetic: ScaleTypeAesthetic;
  dataKind: ProfileFieldType;
}): RecommendedScaleType {
  const aes = query.aesthetic === "colour" ? "color" : query.aesthetic;
  if (aes === "x" || aes === "y") {
    if (query.dataKind === "nominal" || query.dataKind === "ordinal") return "band";
    // quantitative + temporal position → continuous linear (temporalKind is separate)
    return "linear";
  }
  if (aes === "shape" || aes === "linetype") {
    return "ordinal";
  }
  if (query.dataKind === "quantitative" || query.dataKind === "temporal") {
    return "sequential";
  }
  return "ordinal";
}

export const scale_type = scaleType;
