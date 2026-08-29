/**
 * Ribbon geom structural form checks (orientation contracts).
 * Orchestrated by validate-structure-layers.ts.
 */
import type { SpecError } from "./errors.js";
import type { ChannelName } from "./schema.js";
import { isRecord, pushMissingChannel } from "./validate-structure-layer-shared.js";

export function ribbonStructuralErrors(
  layer: Record<string, unknown>,
  layerPath: string,
  mapped: (channel: ChannelName) => unknown,
): SpecError[] {
  const errors: SpecError[] = [];
  const params = isRecord(layer["params"]) ? layer["params"] : {};
  const pinned =
    params["orientation"] === "x" || params["orientation"] === "y" ? params["orientation"] : null;
  const xContract =
    mapped("x") !== undefined && mapped("ymin") !== undefined && mapped("ymax") !== undefined;
  const yContract =
    mapped("y") !== undefined && mapped("xmin") !== undefined && mapped("xmax") !== undefined;

  if (pinned === null && xContract && yContract) {
    errors.push({
      code: "ribbon-orientation-ambiguous",
      path: `${layerPath}/params/orientation`,
      message:
        'This ribbon layer maps both x-orientation (x+ymin+ymax) and y-orientation (y+xmin+xmax) contracts. Set params.orientation to "x" or "y".',
      fix: {
        description: "Pin orientation explicitly.",
        example: { params: { orientation: "x" } },
      },
    });
    return errors;
  }

  const orientation: "x" | "y" | null =
    pinned === "x" || pinned === "y" ? pinned : xContract ? "x" : yContract ? "y" : null;

  const usesYContract =
    orientation === "y" ||
    (orientation === null &&
      [mapped("y"), mapped("xmin"), mapped("xmax")].some((value) => value !== undefined));
  const needed: ChannelName[] = usesYContract ? ["y", "xmin", "xmax"] : ["x", "ymin", "ymax"];

  for (const channel of needed) {
    if (mapped(channel) !== undefined) continue;
    const suffix = ribbonContractSuffix(orientation);
    pushMissingChannel(
      errors,
      layerPath,
      channel,
      `The ribbon geom ${suffix} requires a "${channel}" channel; map it in the layer's aes or the plot-level aes.`,
    );
  }
  return errors;
}

function ribbonContractSuffix(orientation: "x" | "y" | null): string {
  return orientation === null ? "for its interval contract" : `with orientation "${orientation}"`;
}
