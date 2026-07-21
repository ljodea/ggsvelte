import { describe, expect, test } from "bun:test";

import { guideSectionDomId } from "../apps/docs/src/lib/catalog/guide.ts";

describe("guideSectionDomId", () => {
  test("slugifies multi-word guide sections for ARIA IDREFs", () => {
    expect(guideSectionDomId("Core grammar")).toBe("guide-core-grammar");
    expect(guideSectionDomId("Start")).toBe("guide-start");
    expect(guideSectionDomId("  Extra  Spaces  ")).toBe("guide-extra-spaces");
  });
});
