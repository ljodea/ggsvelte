/**
 * Field-resolution helpers shared by bindLayer validation and assembly.
 */
import type { ChannelValue } from "@ggsvelte/spec";
import { didYouMean } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import type { ColorBinding, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

/** y-channel { stat } columns each stat exposes (module-header contracts). */
export const STAT_Y_COLUMNS: Record<string, readonly string[]> = {
  identity: [],
  count: ["count"],
  bin: ["count", "density", "ncount", "ndensity"],
  density: ["density", "count", "scaled", "ndensity"],
  smooth: [],
  boxplot: [],
  summary: [],
};

export function checkField(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): string | null {
  if (channel === undefined || channel === null) return null;
  if (!("field" in channel)) return null;
  if (!table.has(channel.field)) {
    const suggestion = didYouMean(channel.field, table.fields);
    throw new PipelineError(
      "unknown-field",
      `/layers/${layerIndex}/aes/${channelName}`,
      `Unknown field "${channel.field}" (available: ${table.fields.join(", ") || "none"}).` +
        (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    );
  }
  if (allNull(table.column(channel.field))) {
    throw new PipelineError(
      "all-null-column",
      `/layers/${layerIndex}/aes/${channelName}`,
      `Field "${channel.field}" contains only null values; the "${channelName}" channel cannot be drawn from it.`,
    );
  }
  void warnings;
  return channel.field;
}

function allNull(column: readonly CellValue[]): boolean {
  if (column.length === 0) return false;
  for (const v of column) if (v !== null) return false;
  return true;
}

export function requireField(
  field: string | null,
  channelName: string,
  layerIndex: number,
  geom: string,
): string {
  if (field === null) {
    throw new PipelineError(
      "missing-channel",
      `/layers/${layerIndex}/aes/${channelName}`,
      `The ${geom} geom requires a "${channelName}" channel (map it with aes).`,
    );
  }
  return field;
}

export function colorBinding(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): ColorBinding {
  const out: ColorBinding = { field: null, constant: null, scaledConstant: null };
  if (channel === undefined || channel === null) return out;
  if ("field" in channel) {
    out.field = checkField(channel, channelName, layerIndex, table, warnings);
  } else if ("value" in channel) {
    if (channel.scale === true) out.scaledConstant = channel.value;
    else out.constant = String(channel.value);
  } else {
    warnings.push({
      code: "stat-channel-unsupported",
      message: `Layer ${layerIndex}: { stat } mappings on the "${channelName}" channel are not supported yet; the mapping is ignored.`,
    });
  }
  return out;
}
