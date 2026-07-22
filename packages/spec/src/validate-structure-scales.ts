/**
 * Data-free structural checks for named color/fill schemes vs scale family.
 * Layer grammar: validate-structure-layers.ts. Facet: validate-structure-facet.ts.
 */
import type { SpecError } from "./errors.js";
import { CATEGORICAL_SCHEME_NAMES, SEQUENTIAL_SCHEME_NAMES } from "./schema.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const CATEGORICAL_SCHEMES = new Set<string>(CATEGORICAL_SCHEME_NAMES);
const SEQUENTIAL_SCHEMES = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

/** Named color schemes must match the configured color scale family. */
const GUIDE_AESTHETICS = [
  "x",
  "y",
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "shape",
  "linetype",
] as const;

/** Guide variants are constrained by aesthetic and explicit scale family. */
export function guideStructuralErrors(
  guides: Record<string, unknown>,
  scales: Record<string, unknown> | undefined,
): SpecError[] {
  const errors: SpecError[] = [];
  const check = (aesthetic: (typeof GUIDE_AESTHETICS)[number], guide: unknown, path: string) => {
    if (!isRecord(guide) || typeof guide["type"] !== "string") return;
    const type = guide["type"];
    if (type === "none") return;
    const positional = aesthetic === "x" || aesthetic === "y";
    const scale = isRecord(scales?.[aesthetic]) ? scales?.[aesthetic] : undefined;
    const scaleType = scale?.["type"];
    const valid = positional
      ? type === "axis"
      : aesthetic === "color" || aesthetic === "fill"
        ? type === "legend" ||
          (type === "colorbar" && (scaleType === undefined || scaleType === "sequential")) ||
          (type === "colorsteps" && scaleType === "binned")
        : type === "legend";
    if (valid) return;
    errors.push({
      code: "guide-aesthetic-incompatible",
      path,
      message: `The ${type} guide is incompatible with the ${aesthetic} aesthetic${typeof scaleType === "string" ? ` using a ${scaleType} scale` : ""}.`,
      fix: {
        description: positional
          ? 'Use { type: "axis" } or { type: "none" } for positional aesthetics.'
          : aesthetic === "color" || aesthetic === "fill"
            ? "Use legend for discrete colors, colorbar for sequential colors, colorsteps for binned colors, or none."
            : 'Use { type: "legend" } or { type: "none" } for mapped style aesthetics.',
      },
    });
  };
  for (const aesthetic of GUIDE_AESTHETICS) {
    check(aesthetic, guides[aesthetic], `/guides/${aesthetic}`);
    const scale = scales?.[aesthetic];
    if (isRecord(scale)) check(aesthetic, scale["guide"], `/scales/${aesthetic}/guide`);
  }
  return errors;
}

/** Named color schemes must match the configured color scale family. */
export function colorScaleStructuralErrors(scales: Record<string, unknown>): SpecError[] {
  const errors: SpecError[] = [];
  for (const channel of ["color", "fill"] as const) {
    const scale = scales[channel];
    if (!isRecord(scale)) continue;
    const type = scale["type"];
    const scheme = scale["scheme"];
    if (
      (type === "sequential" || type === "binned") &&
      typeof scheme === "string" &&
      CATEGORICAL_SCHEMES.has(scheme)
    ) {
      errors.push({
        code: "scale-scheme-type",
        path: `/scales/${channel}/scheme`,
        message: `The categorical scheme "${scheme}" cannot be used with a ${type} color scale.`,
        fix: {
          description: 'Use "viridis" or provide a sequential range of #rgb/#rrggbb stops.',
          example: "viridis",
        },
      });
    } else if (
      (type === "ordinal" || type === "manual") &&
      typeof scheme === "string" &&
      SEQUENTIAL_SCHEMES.has(scheme)
    ) {
      errors.push({
        code: "scale-scheme-type",
        path: `/scales/${channel}/scheme`,
        message:
          type === "ordinal"
            ? 'The sequential scheme "viridis" cannot be used with an ordinal color scale.'
            : 'The sequential scheme "viridis" cannot be used with a manual color scale.',
        fix: {
          description: "Use a categorical scheme or provide an ordinal range of CSS colors.",
          example: "observable10",
        },
      });
    }

    const transform = scale["transform"];
    const temporal = scale["temporalKind"] !== undefined || scale["parse"] !== undefined;
    const describedType = typeof type === "string" ? type : "inferred";
    if (
      typeof transform === "string" &&
      transform !== "identity" &&
      (temporal || type === "ordinal" || type === "manual" || type === "identity")
    ) {
      errors.push({
        code: "scale-type-transform-conflict",
        path: `/scales/${channel}/transform`,
        message: `The ${describedType} ${channel} scale cannot apply the ${transform} transform${temporal ? " to temporal values" : ""}.`,
        fix: {
          description:
            "Remove the transform, or use a non-temporal sequential/binned quantitative scale.",
          example: "identity",
        },
      });
    }

    const range = scale["range"];
    const domain = scale["domain"];
    if (
      type === "manual" &&
      Array.isArray(domain) &&
      Array.isArray(range) &&
      domain.length !== range.length
    ) {
      errors.push({
        code: "scale-manual-domain-range",
        path: `/scales/${channel}`,
        message: `The manual ${channel} scale has ${String(domain.length)} domain values but ${String(range.length)} range colors.`,
        fix: {
          description: "Provide exactly one range color for each explicit domain value.",
        },
      });
    }

    if (!Array.isArray(range)) continue;
    for (let index = 0; index < range.length; index++) {
      const color: unknown = range[index];
      if (typeof color !== "string" || /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) continue;
      errors.push({
        code: "scale-range-color",
        path: `/scales/${channel}/range/${index}`,
        message: `The color stop "${color}" is not a supported hex color.`,
        fix: {
          description: "Use #rgb or #rrggbb syntax for custom color ranges.",
          example: "#ff0000",
        },
      });
    }
  }
  return errors;
}
