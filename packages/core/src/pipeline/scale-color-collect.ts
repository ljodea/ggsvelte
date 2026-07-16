/**
 * Collect color/fill channel values across panel frames for scale training.
 */
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import type { LayerFrame } from "./types.js";

export interface CollectedColorChannel {
  values: CellValue[];
  anyDiscreteField: boolean;
  anyField: boolean;
}

export function collectColorChannelValues(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  table: ColumnTable,
): CollectedColorChannel {
  const values: CellValue[] = [];
  let anyDiscreteField = false;
  let anyField = false;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (channel.field !== null && frameValues !== null) {
      anyField = true;
      if (table.has(channel.field) && table.discreteness(channel.field) === "discrete") {
        anyDiscreteField = true;
      }
      for (const v of frameValues) values.push(v);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      values.push(channel.scaledConstant);
    }
  }
  return { values, anyDiscreteField, anyField };
}
