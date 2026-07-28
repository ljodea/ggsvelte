import { afterEach, describe, expect, it } from "bun:test";

import { observeNearViewport } from "../apps/docs/src/lib/near-viewport.ts";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

const originalIO = globalThis.IntersectionObserver;

afterEach(() => {
  globalThis.IntersectionObserver = originalIO;
});

function installMockIO(state: {
  observed: Element | null;
  callback: ObserverCallback | null;
  disconnected: number;
  rootMargin: string | undefined;
}): void {
  globalThis.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      state.callback = cb as unknown as ObserverCallback;
      state.rootMargin = options?.rootMargin;
    }
    observe(el: Element): void {
      state.observed = el;
    }
    disconnect(): void {
      state.disconnected += 1;
    }
    unobserve(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
  } as unknown as typeof IntersectionObserver;
}

describe("observeNearViewport", () => {
  it("fires immediately when IntersectionObserver is unavailable", () => {
    // @ts-expect-error intentional removal for the no-IO path
    delete globalThis.IntersectionObserver;
    const target = {} as Element;
    let calls = 0;
    const stop = observeNearViewport(target, () => {
      calls += 1;
    });
    expect(calls).toBe(1);
    stop();
    expect(calls).toBe(1);
  });

  it("observes the target and fires once when it intersects", () => {
    const state = {
      observed: null as Element | null,
      callback: null as ObserverCallback | null,
      disconnected: 0,
      rootMargin: undefined as string | undefined,
    };
    installMockIO(state);

    const target = { id: "specimen" } as unknown as Element;
    let calls = 0;
    const stop = observeNearViewport(target, () => {
      calls += 1;
    });

    expect(state.observed).toBe(target);
    expect(state.rootMargin).toBe("240px 0px");
    expect(calls).toBe(0);
    expect(state.callback).not.toBeNull();

    state.callback?.([{ isIntersecting: false }]);
    expect(calls).toBe(0);

    state.callback?.([{ isIntersecting: true }]);
    expect(calls).toBe(1);
    expect(state.disconnected).toBe(1);

    // Second intersect is a no-op (already fired + disconnected).
    state.callback?.([{ isIntersecting: true }]);
    expect(calls).toBe(1);

    stop();
  });

  it("accepts a custom rootMargin and cleans up on stop before fire", () => {
    const state = {
      observed: null as Element | null,
      callback: null as ObserverCallback | null,
      disconnected: 0,
      rootMargin: undefined as string | undefined,
    };
    installMockIO(state);

    let calls = 0;
    const stop = observeNearViewport(
      {} as Element,
      () => {
        calls += 1;
      },
      { rootMargin: "100px 0px" },
    );
    expect(state.rootMargin).toBe("100px 0px");
    stop();
    expect(state.disconnected).toBe(1);
    expect(calls).toBe(0);
  });
});
