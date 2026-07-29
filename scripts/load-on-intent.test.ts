import { describe, expect, it } from "bun:test";

import { observeUserIntent } from "../apps/docs/src/lib/load-on-intent.ts";

function makeTarget(): {
  el: Element;
  fire: (type: "pointerenter" | "focusin") => void;
} {
  const listeners = new Map<string, Set<EventListener>>();
  const el = {
    addEventListener(type: string, listener: EventListener): void {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: EventListener): void {
      listeners.get(type)?.delete(listener);
    },
  } as unknown as Element;

  const fire = (type: "pointerenter" | "focusin"): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  };

  return { el, fire };
}

describe("observeUserIntent", () => {
  it("fires once on pointerenter and ignores later events", () => {
    const { el, fire } = makeTarget();
    let calls = 0;
    const stop = observeUserIntent(el, () => {
      calls += 1;
    });
    expect(calls).toBe(0);
    fire("pointerenter");
    expect(calls).toBe(1);
    fire("pointerenter");
    fire("focusin");
    expect(calls).toBe(1);
    stop();
  });

  it("fires on focusin when the user tabs in", () => {
    const { el, fire } = makeTarget();
    let calls = 0;
    observeUserIntent(el, () => {
      calls += 1;
    });
    fire("focusin");
    expect(calls).toBe(1);
  });

  it("stop before intent prevents the load", () => {
    const { el, fire } = makeTarget();
    let calls = 0;
    const stop = observeUserIntent(el, () => {
      calls += 1;
    });
    stop();
    fire("pointerenter");
    expect(calls).toBe(0);
  });
});
