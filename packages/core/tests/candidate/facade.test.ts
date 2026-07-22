import { describe, expect, it } from "bun:test";

describe("candidate-store public facade", () => {
  it("exposes only buildCandidateStore and canonicalAxisToken at runtime", async () => {
    const facade = await import("../../src/candidate-store.ts");
    expect(Object.keys(facade).toSorted()).toEqual(
      ["buildCandidateStore", "canonicalAxisToken"].toSorted(),
    );
  });
});
