import { afterEach, describe, expect, it } from "bun:test";

import { observeNearViewport } from "../apps/docs/src/lib/near-viewport.ts";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

const originalIO = globalThis.IntersectionObserver;

afterEach(() => {
  globalThis.IntersectionObserver = originalIO;
});

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
    let observed: Element | null = null;
    let callback: ObserverCallback | null = null;
    let disconnected = 0;
    let observedRootMargin: string | undefined;

    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        callback = cb as unknown as ObserverCallback;
        observedRootMargin = options?.rootMargin;
      }
      observe(el: Element): void {
        observed = el;
      }
      disconnect(): void {
        disconnected += 1;
      }
      unobserve(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
    } as unknown as typeof IntersectionObserver;

    const target = { id: "specimen" } as unknown as Element;
    let calls = 0;
    const stop = observeNearViewport(target, () => {
      calls += 1;
    });

    expect(observed).toBe(target);
    expect(observedRootMargin).toBe("240px 0px");
    expect(calls).toBe(0);

    callback?.([{ isIntersecting: false }]);
    expect(calls).toBe(0);

    callback?.([{ isIntersecting: true }]);
    expect(calls).toBe(1);
    expect(disconnected).toBe(1);

    // Second intersect is a no-op (already fired + disconnected).
    callback?.([{ isIntersecting: true }]);
    expect(calls).toBe(1);

    stop();
  });

  it("accepts a custom rootMargin and cleans up on stop before fire", () => {
    let disconnected = 0;
    let observedRootMargin: string | undefined;

    globalThis.IntersectionObserver = class {
      constructor(_cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observedRootMargin = options?.rootMargin;
      }
      observe(): void {}
      disconnect(): void {
        disconnected += 1;
      }
      unobserve(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
    } as unknown as typeof IntersectionObserver;

    let calls = 0;
    const stop = observeNearViewport(
      {} as Element,
      () => {
        calls += 1;
      },
      { rootMargin: "100px 0px" },
    );
    expect(observedRootMargin).toBe("100px 0px");
    stop();
    expect(disconnected).toBe(1);
    expect(calls).toBe(0);
  });
});
