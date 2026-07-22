/**
 * Lazy identity index construction.
 */
import { describe, expect, it } from "bun:test";

describe("createLazyIdentityIndex", () => {
  it("builds the index once and reuses it", async () => {
    const { createLazyIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    let calls = 0;
    // empty panels produce a stable empty-ish index; count construction via
    // successive get() returning the same reference.
    const get = createLazyIdentityIndex([], []);
    const a = get();
    const b = get();
    expect(a).toBe(b);
    // silence unused
    expect(calls).toBe(0);
  });
});
