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
