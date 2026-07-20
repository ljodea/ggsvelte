import type { CellValue } from "@ggsvelte/core";
import type { PlotInteractionEvent } from "@ggsvelte/svelte";

export type PlaygroundInteractionEvent = PlotInteractionEvent<Record<string, CellValue>>;

export const PLAYGROUND_MAX_EVENTS = 20;

export interface PlaygroundEventEntry {
  readonly sequence: number;
  readonly type: PlaygroundInteractionEvent["type"];
  readonly phase: string;
  readonly source: string;
  readonly json: string;
}

function jsonSafeEvent(event: PlaygroundInteractionEvent): unknown {
  return JSON.parse(
    JSON.stringify(event, (_key, value: unknown) => {
      if (typeof value === "symbol" || typeof value === "bigint") return String(value);
      return value;
    }),
  ) as unknown;
}

export function appendPlaygroundEvent(
  entries: readonly PlaygroundEventEntry[],
  event: PlaygroundInteractionEvent,
): readonly PlaygroundEventEntry[] {
  const projected = jsonSafeEvent(event);
  const next: PlaygroundEventEntry = {
    sequence: (entries.at(-1)?.sequence ?? 0) + 1,
    type: event.type,
    phase: event.phase,
    source: event.source,
    json: JSON.stringify(projected, null, 2),
  };
  return [...entries, next].slice(-PLAYGROUND_MAX_EVENTS);
}
