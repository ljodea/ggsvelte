/**
 * Default color/fill swatches for /reference/scales/* detail pages.
 *
 * Pure hex tables only — no chart stack. Defaults come from palette-tables
 * (same deep paths as /palettes); ColorBrewer sequential Blues and gradient
 * stop defaults are mirrored here so docs never import core trainers.
 */
import type { ScaleReferenceEntry } from "@ggsvelte/spec";

import { CATEGORICAL_SCHEMES, VIRIDIS_RAMP_10 } from "./palette-tables.js";

// Mirror packages/spec/src/scale-color-stops.ts (not exported from that module).
const GRADIENT_LOW = "#132B43";
const GRADIENT_HIGH = "#56B1F7";
const GRADIENT2_LOW = "#B2182B";
const GRADIENT2_MID = "#F7F7F7";
const GRADIENT2_HIGH = "#2166AC";

/**
 * ColorBrewer tables mirrored from packages/core colorbrewer-palettes.
 * Local copies: CATEGORICAL_SCHEMES drops Set1/Set2/Set3 from its public type
 * surface under docs svelte-check, and sequential Blues is not categorical.
 */
const CB_SET1: readonly string[] = [
  "#e41a1c",
  "#377eb8",
  "#4daf4a",
  "#984ea3",
  "#ff7f00",
  "#ffff33",
  "#a65628",
  "#f781bf",
  "#999999",
];
const CB_BLUES: readonly string[] = [
  "#f7fbff",
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
];

/** Illustrative stops for helpers that require author-supplied colors. */
const EXAMPLE_MULTI: readonly string[] = ["#440154", "#31688e", "#35b779", "#fde725"];
const EXAMPLE_MANUAL: readonly string[] = ["#4269d0", "#efb118", "#ff725c", "#3ca951"];
const EXAMPLE_IDENTITY: readonly string[] = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"];

export type ScaleSwatchKind = "discrete" | "ramp";

export interface ScaleSwatch {
  readonly colors: readonly string[];
  readonly kind: ScaleSwatchKind;
  /** Short caption under the strip (default scheme / example note). */
  readonly caption: string;
}

function stemOf(slug: string): string {
  // color_continuous → continuous; fill_viridis_c → viridis_c; colour_discrete → discrete
  return slug.replace(/^(?:color|colour|fill)_/, "");
}

function expandStops(stops: readonly string[], count = 12): readonly string[] {
  if (stops.length === 0) return stops;
  const first = stops[0];
  if (stops.length === 1 || first === undefined) {
    return Array.from({ length: count }, () => first ?? "#000000");
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const scaled = t * (stops.length - 1);
    const lo = Math.min(stops.length - 2, Math.floor(scaled));
    const a = stops[lo] ?? first;
    const b = stops[lo + 1] ?? a;
    const f = scaled - lo;
    out.push(lerpHex(a, b, f));
  }
  return out;
}

function hexChannel(hex: string, i: number): number {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  return Number.parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
}

function toHexByte(n: number): string {
  return Math.round(n).toString(16).padStart(2, "0");
}

function lerpHex(a: string, b: string, t: number): string {
  const f = Math.min(1, Math.max(0, t));
  let out = "#";
  for (let c = 0; c < 3; c++) {
    const av = hexChannel(a, c);
    const bv = hexChannel(b, c);
    out += toHexByte(av + (bv - av) * f);
  }
  return out;
}

/**
 * Default swatch for a color/fill scale reference entry, or null when the
 * scale is not a color/fill family.
 */
export function scaleSwatchFor(entry: ScaleReferenceEntry): ScaleSwatch | null {
  if (entry.family !== "color-fill") return null;

  const stem = stemOf(entry.slug);

  switch (stem) {
    case "discrete":
    case "ordinal":
      return {
        colors: CATEGORICAL_SCHEMES.observable10,
        kind: "discrete",
        caption: 'Default scheme "observable10"',
      };
    case "continuous":
    case "binned":
    case "log10":
    case "sqrt":
    case "date":
    case "datetime":
    case "viridis_c":
    case "viridis_b":
    case "viridis_d":
      return {
        colors: VIRIDIS_RAMP_10,
        kind: "ramp",
        caption:
          stem === "viridis_d"
            ? 'Viridis discrete sample (option "viridis")'
            : stem.startsWith("viridis")
              ? 'Viridis ramp (option "viridis")'
              : 'Default sequential scheme "viridis"',
      };
    case "hue":
      return {
        colors: CATEGORICAL_SCHEMES.hue,
        kind: "discrete",
        caption: 'Default scheme "hue"',
      };
    case "grey":
      return {
        colors: CATEGORICAL_SCHEMES.grey,
        kind: "discrete",
        caption: 'Default scheme "grey"',
      };
    case "brewer":
      return {
        colors: CB_SET1,
        kind: "discrete",
        caption: 'Example palette "Set1" (ColorBrewer qualitative)',
      };
    case "distiller":
    case "fermenter":
      return {
        colors: CB_BLUES,
        kind: "ramp",
        caption: 'Example palette "Blues" (ColorBrewer sequential)',
      };
    case "gradient":
    case "steps":
      return {
        colors: expandStops([GRADIENT_LOW, GRADIENT_HIGH]),
        kind: "ramp",
        caption: `Default low→high (${GRADIENT_LOW} → ${GRADIENT_HIGH})`,
      };
    case "gradient2":
    case "steps2":
      return {
        colors: expandStops([GRADIENT2_LOW, GRADIENT2_MID, GRADIENT2_HIGH]),
        kind: "ramp",
        caption: `Default low→mid→high (${GRADIENT2_LOW} → ${GRADIENT2_MID} → ${GRADIENT2_HIGH})`,
      };
    case "gradientn":
    case "stepsn":
      return {
        colors: expandStops(EXAMPLE_MULTI),
        kind: "ramp",
        caption: "Example colours (author must supply ≥2 stops)",
      };
    case "manual":
      return {
        colors: EXAMPLE_MANUAL,
        kind: "discrete",
        caption: "Example values (author must supply colors)",
      };
    case "identity":
      return {
        colors: EXAMPLE_IDENTITY,
        kind: "discrete",
        caption: "Example identity colors (data values are #hex colors)",
      };
    default:
      // Fallback: sequential → viridis, ordinal-ish → observable10
      if (entry.scaleType === "sequential" || entry.scaleType === "binned") {
        return {
          colors: VIRIDIS_RAMP_10,
          kind: "ramp",
          caption: 'Default sequential scheme "viridis"',
        };
      }
      return {
        colors: CATEGORICAL_SCHEMES.observable10,
        kind: "discrete",
        caption: 'Default scheme "observable10"',
      };
  }
}
