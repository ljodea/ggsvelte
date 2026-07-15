import { tick } from "svelte";
import { describe, expect, it } from "vitest";

import HydrationFixture from "./fixtures/HydrationFixture.svelte";
import { hydrateSsrFixture } from "./helpers/hydration.js";

describe("hydration release fixture", () => {
  it("hydrates SSR markers, preserves content, and attaches DOM events", async () => {
    const target = document.createElement("div");
    // Canonical output from renderSsrFixture(HydrationFixture, props). Keeping
    // this explicit makes changes to Svelte's SSR marker contract visible.
    target.innerHTML = '<!--[--><button data-hydrated="false">Selected: 2</button><!--]-->';
    document.body.append(target);

    const cleanup = hydrateSsrFixture(HydrationFixture, target, { label: "Selected", count: 2 });
    await tick();

    const button = target.querySelector("button");
    expect(button?.dataset.hydrated).toBe("true");
    button?.click();
    await tick();
    expect(button?.textContent).toBe("Selected: 3");

    await cleanup();
    target.remove();
  });
});
