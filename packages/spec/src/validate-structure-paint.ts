/**
 * Structural validation for within-mark paint (#591): stop order and
 * data-mapped fill/color conflicts. Schema already rejects empty stops,
 * out-of-range offsets, non-hex colors, and excessive glow radii.
 */
import type { SpecError } from "./errors.js";
import type { Aes, ChannelValue } from "./schema.js";
import { effectiveChannel } from "./validate-data.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isDataMapped(channel: ChannelValue | undefined): boolean {
  if (channel === undefined || channel === null) return false;
  if ("field" in channel) return true;
  if ("value" in channel && channel.scale === true) return true;
  return false;
}

function stopOrderErrors(paint: unknown, path: string): SpecError[] {
  if (!isRecord(paint) || !Array.isArray(paint["stops"])) return [];
  const stops = paint["stops"] as unknown[];
  let prev = -Infinity;
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (!isRecord(stop) || typeof stop["offset"] !== "number") continue;
    const offset = stop["offset"];
    if (offset < prev) {
      return [
        {
          code: "paint-stops-unordered",
          path: `${path}/stops/${String(i)}/offset`,
          message: `Gradient stop offsets must be non-decreasing; stop ${String(i)} has offset ${String(offset)} after ${String(prev)}.`,
          fix: {
            description: "Sort stops by offset ascending (each between 0 and 1).",
            example: {
              stops: [
                { offset: 0, color: "#000000" },
                { offset: 1, color: "#ffffff" },
              ],
            },
          },
        },
      ];
    }
    prev = offset;
  }
  return [];
}

/**
 * Paint structural checks for one layer (opt-in tier-2 via validate options).
 */
export function paintStructuralErrors(
  layer: Record<string, unknown>,
  layerPath: string,
  plotAes: Aes | undefined,
): SpecError[] {
  const errors: SpecError[] = [];
  const params = isRecord(layer["params"]) ? layer["params"] : null;
  if (params === null) return errors;

  const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
  const fill = effectiveChannel(plotAes, layerAes, "fill");
  const color = effectiveChannel(plotAes, layerAes, "color");

  if (params["fillPaint"] !== undefined) {
    errors.push(...stopOrderErrors(params["fillPaint"], `${layerPath}/params/fillPaint`));
    if (isDataMapped(fill as ChannelValue | undefined)) {
      errors.push({
        code: "paint-scale-conflict",
        path: `${layerPath}/params/fillPaint`,
        message:
          "params.fillPaint cannot combine with a data-mapped fill channel (field or scaled constant).",
        fix: {
          description: "Remove aes.fill field mapping, or remove fillPaint and keep the scale.",
          example: { params: { fillPaint: { type: "linear" } } },
        },
      });
    }
  }

  if (params["strokePaint"] !== undefined) {
    errors.push(...stopOrderErrors(params["strokePaint"], `${layerPath}/params/strokePaint`));
    if (isDataMapped(color as ChannelValue | undefined)) {
      errors.push({
        code: "paint-scale-conflict",
        path: `${layerPath}/params/strokePaint`,
        message:
          "params.strokePaint cannot combine with a data-mapped color channel (field or scaled constant).",
        fix: {
          description: "Remove aes.color field mapping, or remove strokePaint and keep the scale.",
          example: { params: { strokePaint: { type: "linear" } } },
        },
      });
    }
  }

  return errors;
}
