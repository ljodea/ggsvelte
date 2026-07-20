import { describe, expect, it } from "bun:test";

import lifecycle from "../lifecycle.json";
import {
  assertGuideCodeContract,
  codeBlocks,
  COMPLETE_SVELTE_SNIPPETS,
} from "./guide-code-contract.ts";
import { guidePages, type LifecycleDoc } from "./gen-llms.ts";
import { QUICKSTART_PAGE_SVELTE } from "./quickstart.ts";

describe("guide code truth contract", () => {
  it("rejects unclassified, doubly classified, and unknown complete Svelte blocks", () => {
    expect(() => {
      assertGuideCodeContract("# Bad\n\n```svelte\n<x />\n```", "bad");
    }).toThrow("complete or fragment");
    expect(() => {
      assertGuideCodeContract("```svelte complete fragment\n<x />\n```", "both");
    }).toThrow("exactly one");
    expect(() => {
      assertGuideCodeContract("```svelte complete\n<Unknown />\n```", "unknown");
    }).toThrow("packed snippet registry");
  });

  it("classifies every guide fence and registers every complete Svelte file", () => {
    for (const page of guidePages(lifecycle as unknown as LifecycleDoc)) {
      expect(() => {
        assertGuideCodeContract(page.markdown, page.slug);
      }).not.toThrow();
      for (const block of codeBlocks(page.markdown)) {
        expect(["complete", "fragment"]).toContain(block.classification);
      }
    }
  });

  it("keeps the complete Quickstart byte-identical to the packed registry", () => {
    expect(COMPLETE_SVELTE_SNIPPETS).toEqual([
      {
        filename: "src/routes/+page.svelte",
        source: QUICKSTART_PAGE_SVELTE,
      },
    ]);
  });
});
