/**
 * Project trained position scales into layout Domain inputs.
 */
import type {
  BandLayoutDomainContext,
  Domain,
  TemporalLayoutDomainContext,
} from "../layout/layout.js";
import { encodeKey } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

export function layoutDomain(
  scale: PositionScale,
  breaks: readonly (number | string)[] | undefined,
  temporal?: TemporalLayoutDomainContext,
  band?: BandLayoutDomainContext,
): Domain {
  if (scale.type === "band") {
    return {
      type: "band",
      categories: [...scale.domain],
      rawCategories: scale.rawDomain,
      ...(breaks !== undefined && {
        // First-occurrence dedupe by encodeKey (O(K)), not nested findIndex (O(K²)).
        breaks: (() => {
          const seen = new Set<string>();
          const unique: (string | number)[] = [];
          for (const value of breaks) {
            const key = encodeKey(value);
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(value as string | number);
          }
          return unique;
        })(),
      }),
      ...(band !== undefined && { band }),
    };
  }
  const numericBreaks =
    breaks === undefined
      ? undefined
      : breaks.map((b) => cellToNumber(b as CellValue)).filter((v) => Number.isFinite(v));
  if (scale.type === "time") {
    return {
      type: "time",
      min: scale.domain[0],
      max: scale.domain[1],
      ...(numericBreaks !== undefined && { breaks: numericBreaks }),
      ...(temporal !== undefined && { temporal }),
    };
  }
  return {
    type: "linear",
    transform: scale.transform,
    min: scale.domain[0],
    max: scale.domain[1],
    ...(numericBreaks !== undefined && { breaks: numericBreaks }),
  };
}
