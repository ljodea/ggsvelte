import type { InteractionDiagnostic, InteractionTool } from "./interaction.js";

export type ZoomAreaMode = "x" | "y" | "xy";

/**
 * Drop zoom-area when no continuous channel supports brush zoom.
 * Other tools pass through unchanged.
 */
export function filterAvailableTools(
  tools: readonly InteractionTool[],
  zoomHasSupportedChannel: boolean,
): InteractionTool[] {
  return tools.filter((tool) => tool !== "zoom-area" || zoomHasSupportedChannel);
}

export type ScaleTypeRef = {
  readonly x: { readonly type: string };
  readonly y: { readonly type: string };
};

/** True when at least one channel requested by mode is non-band. */
export function zoomSupportsChannel(mode: ZoomAreaMode, scales: ScaleTypeRef): boolean {
  return (mode !== "y" && scales.x.type !== "band") || (mode !== "x" && scales.y.type !== "band");
}

/** Band channels that block zoom under the given mode. */
export function bandChannelsForZoom(mode: ZoomAreaMode, scales: ScaleTypeRef): Array<"x" | "y"> {
  const channels: Array<"x" | "y"> = [];
  if (mode !== "y" && scales.x.type === "band") channels.push("x");
  if (mode !== "x" && scales.y.type === "band") channels.push("y");
  return channels;
}

/**
 * Zoom-only band-scale diagnostics (not interval-select).
 * `catalogEntry` is spread into each diagnostic with prop/actual filled.
 */
export function zoomScaleDiagnosticsFromChannels(
  channels: readonly ("x" | "y")[],
  catalogEntry: Omit<InteractionDiagnostic, "prop" | "actual"> &
    Partial<Pick<InteractionDiagnostic, "prop" | "actual">>,
): InteractionDiagnostic[] {
  return channels.map((channel) => ({
    ...catalogEntry,
    prop: `scales.${channel}`,
    actual: "band",
  }));
}

export type CapabilityStatusInput = {
  readonly facetUnavailableMessage?: string;
  readonly areaDiagnostics: readonly InteractionDiagnostic[];
  readonly zoomSupported: boolean;
  readonly interactive: boolean;
  readonly emptyPlot: boolean;
  /** Null when no render model (preserves host `model !== null` guard). */
  readonly candidateCount: number | null;
};

/**
 * User-facing capability status under the plot.
 * Order: facet unavailable → zoom limited/unavailable → no inspectable marks → null.
 */
export function capabilityStatusText(input: CapabilityStatusInput): string | null {
  if (input.facetUnavailableMessage !== undefined)
    return `Area interaction unavailable: ${input.facetUnavailableMessage}`;
  if (input.areaDiagnostics.length > 0)
    return `Zoom ${input.zoomSupported ? "limited" : "unavailable"}: ${input.areaDiagnostics[0]!.message}`;
  if (
    input.interactive &&
    !input.emptyPlot &&
    input.candidateCount !== null &&
    input.candidateCount === 0
  )
    return "No inspectable marks";
  return null;
}
