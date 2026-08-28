import type { IntervalConsumptionCandidate } from "../../src/lib/interval/consumption.js";
import type { PlotInteractionInterval } from "../../src/lib/interaction/interaction.js";

export const panels = [{ id: "north" }, { id: "south" }] as const;

export const candidates: readonly IntervalConsumptionCandidate<string>[] = [
  { panelId: "north", xValue: 1, yValue: "low", keys: ["n1"] },
  { panelId: "north", xValue: 4, yValue: "high", keys: ["n4", "shared"] },
  { panelId: "south", xValue: 2, yValue: "low", keys: ["s2", "shared"] },
  { panelId: "south", xValue: 8, yValue: "high", keys: ["s8"] },
  { panelId: "dormant", xValue: 3, yValue: "low", keys: ["gone"] },
];

export function record(
  panelId: string,
  preset: PlotInteractionInterval<string>["preset"],
  keys: readonly string[],
): PlotInteractionInterval<string> {
  return {
    panelId,
    preset,
    domains: { x: { kind: "linear", domain: [1, 5] } },
    keys,
  };
}
