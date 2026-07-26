/**
 * Resolve color/fill ChannelValue into a ColorBinding.
 */
import type { ChannelValue } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { checkField } from "./bind-layer-check-field.js";
import type { ColorBinding, PipelineWarning } from "./types.js";

export function colorBinding(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): ColorBinding {
  const out: ColorBinding = {
    field: null,
    statColumn: null,
    constant: null,
    scaledConstant: null,
  };
  if (channel === undefined || channel === null) return out;
  if ("field" in channel) {
    out.field = checkField(channel, channelName, layerIndex, table, warnings);
  } else if ("stat" in channel) {
    // after_stat columns (e.g. density_2d_filled fill → level; #802 phase 2).
    out.statColumn = channel.stat;
  } else if ("value" in channel) {
    if (channel.scale === true) out.scaledConstant = channel.value;
    else out.constant = String(channel.value);
  } else {
    warnings.push({
      code: "stat-channel-unsupported",
      message: `Layer ${layerIndex}: unsupported mapping form on the "${channelName}" channel; the mapping is ignored.`,
    });
  }
  return out;
}
