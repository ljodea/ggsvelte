/**
 * Project trained position scales into layout Domain inputs.
 */
import type { Domain } from "../layout/layout.js";
import { encodeKey } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

export function layoutDomain(
  scale: PositionScale,
  breaks: readonly (number | string)[] | undefined,
): Domain {
  if (scale.type === "band") {
    return {
      type: "band",
      categories: [...scale.domain],
      rawCategories: scale.rawDomain,
      ...(breaks !== undefined && {
        breaks: breaks.filter(
          (value, index) =>
            breaks.findIndex((candidate) => encodeKey(candidate) === encodeKey(value)) === index,
        ),
      }),
    };
  }
  const numericBreaks =
    breaks === undefined
      ? undefined
      : breaks.map((b) => cellToNumber(b as CellValue)).filter((v) => Number.isFinite(v));
  return {
    type: scale.type,
    min: scale.domain[0],
    max: scale.domain[1],
    ...(numericBreaks !== undefined && { breaks: numericBreaks }),
  };
}
