/**
 * Unit tests for the plot live-region announcer.
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { describe, expect, it } from "vitest";

import { createPlotAnnouncer } from "../../src/lib/runtime/announcer.svelte.js";

describe("createPlotAnnouncer", () => {
  it("announce clears then sets after a microtask (live-region re-announce)", async () => {
    const announcer = createPlotAnnouncer();
    expect(announcer.text).toBe("");
    announcer.announce("hello");
    expect(announcer.text).toBe("");
    await Promise.resolve();
    expect(announcer.text).toBe("hello");
    announcer.announce("hello");
    expect(announcer.text).toBe("");
    await Promise.resolve();
    expect(announcer.text).toBe("hello");
  });

  it("clear is synchronous and never swallows a message queued in the same tick", async () => {
    const announcer = createPlotAnnouncer();
    // announce then clear then announce: only the last message may win, and a
    // clear must not queue a blank that lands after a later announce.
    announcer.announce("first");
    announcer.clear();
    expect(announcer.text).toBe("");
    announcer.announce("second");
    await Promise.resolve();
    expect(announcer.text).toBe("second");
  });
});
