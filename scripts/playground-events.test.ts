import { describe, expect, test } from "bun:test";

import {
  appendPlaygroundEvent,
  PLAYGROUND_MAX_EVENTS,
  type PlaygroundInteractionEvent,
} from "../apps/docs/src/lib/playground-events";

function inspectEvent(key: PropertyKey, phase: "change" | "clear" = "change") {
  if (phase === "clear") {
    return {
      type: "inspect",
      phase,
      source: "keyboard",
    } as const satisfies PlaygroundInteractionEvent;
  }
  return {
    type: "inspect",
    phase,
    state: "transient",
    source: "pointer",
    mode: "exact",
    panelId: null,
    focus: {
      key,
      row: { x: 1, label: "first" },
      sourceKeys: [key],
      lineageCount: 1,
      layerIndex: 0,
      panelId: null,
      fields: [{ channel: "x", field: "x", value: 1 }],
      anchor: { x: 10, y: 20 },
    },
    members: [
      {
        key,
        row: { x: 1, label: "first" },
        sourceKeys: [key],
        lineageCount: 1,
        layerIndex: 0,
        panelId: null,
        fields: [{ channel: "x", field: "x", value: 1 }],
        anchor: { x: 10, y: 20 },
      },
    ],
  } as const satisfies PlaygroundInteractionEvent;
}

describe("playground semantic event log", () => {
  test("projects public events to deterministic JSON-safe records", () => {
    const log = appendPlaygroundEvent([], inspectEvent(Symbol("row")));
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      sequence: 1,
      type: "inspect",
      phase: "change",
      source: "pointer",
    });
    expect(log[0]?.json).toContain('"key": "Symbol(row)"');
    expect(() => {
      JSON.parse(log[0]!.json);
    }).not.toThrow();
  });

  test("keeps only the newest bounded records in append order", () => {
    let log = [] as ReturnType<typeof appendPlaygroundEvent>;
    for (let index = 0; index < PLAYGROUND_MAX_EVENTS + 3; index += 1) {
      log = appendPlaygroundEvent(log, inspectEvent(index));
    }
    expect(log).toHaveLength(PLAYGROUND_MAX_EVENTS);
    expect(log[0]?.sequence).toBe(4);
    expect(log.at(-1)?.sequence).toBe(PLAYGROUND_MAX_EVENTS + 3);
  });
});
