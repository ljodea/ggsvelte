/**
 * Resolve color/fill ChannelValue into a ColorBinding.
 */
import type { ChannelValue } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { checkField } from "./bind-layer-check-field.js";
import type { ColorBinding, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

/** After-stat columns published per stat (mirrors style-binding allow-list). */
const STAT_OUTPUTS: Record<string, readonly string[]> = {
  identity: [],
  count: ["count"],
  bin: ["count", "density", "ncount", "ndensity"],
  bin_hex: ["count", "density", "ncount", "ndensity"],
  density: ["density", "count", "scaled", "ndensity"],
  smooth: ["y", "ymin", "ymax", "se"],
  summary: ["y", "ymin", "ymax"],
  boxplot: ["ymin", "lower", "middle", "upper", "ymax"],
};

export function colorBinding(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
  stat: string = "identity",
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
  } else if ("value" in channel) {
    if (channel.scale === true) out.scaledConstant = channel.value;
    else out.constant = String(channel.value);
  } else if ("stat" in channel) {
    if (!(STAT_OUTPUTS[stat] ?? []).includes(channel.stat)) {
      throw new PipelineError(
        "stat-channel-unsupported",
        `/layers/${String(layerIndex)}/aes/${channelName}`,
        `The ${stat} stat does not publish after-stat column "${channel.stat}" for aes.${channelName}.`,
      );
    }
    out.statColumn = channel.stat;
  } else {
    warnings.push({
      code: "stat-channel-unsupported",
      message: `Layer ${layerIndex}: unsupported mapping on the "${channelName}" channel; the mapping is ignored.`,
    });
  }
  return out;
}
