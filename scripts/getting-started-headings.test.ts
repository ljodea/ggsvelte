/**
 * `/guide/getting-started` is the only guide route whose prose is a Svelte
 * component rather than markdown — the markdown at that slug is the agent doc
 * that /llms.txt serves. Its on-this-page navigation is therefore generated
 * from GETTING_STARTED_PAGE_HEADINGS, which nothing else validates.
 *
 * These assertions close that loop: every id the nav offers is really rendered
 * by the component, in the same order, and nothing renders a heading the nav
 * does not know about.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

import { DOCS_ROUTES } from "../apps/docs/src/lib/generated/routes.ts";
import { GETTING_STARTED_PAGE_HEADINGS } from "./quickstart.ts";

const COMPONENT = readFileSync(
  new URL("../apps/docs/src/lib/components/GettingStartedGuide.svelte", import.meta.url).pathname,
  "utf8",
);

/** Heading ids in source order: literal `id="..."` plus the `{step.id}` loop. */
function renderedHeadingIds(): string[] {
  const ids: string[] = [];
  for (const match of COMPONENT.matchAll(/<h([23])\s+id=(?:"([^"]+)"|\{([^}]+)\})/g)) {
    const literal = match[2];
    const expression = match[3];
    if (literal !== undefined) {
      ids.push(literal);
    } else if (expression?.trim() === "step.id") {
      // The step loop renders one <h3> per lesson step, in catalog order.
      ids.push("(steps)");
    } else {
      throw new Error(`unexpected dynamic heading id: ${expression ?? "?"}`);
    }
  }
  return ids;
}

describe("getting-started page navigation", () => {
  it("offers only headings the component renders, in page order", () => {
    const stepIds = GETTING_STARTED_PAGE_HEADINGS.filter((h) => h.level === 3).map((h) => h.id);
    expect(stepIds.length).toBeGreaterThanOrEqual(5);

    const expected = GETTING_STARTED_PAGE_HEADINGS.map((heading) =>
      stepIds.includes(heading.id) ? "(steps)" : heading.id,
    ).filter((id, index, all) => id !== "(steps)" || all[index - 1] !== "(steps)");
    expect(renderedHeadingIds()).toEqual(expected);
  });

  it("is what the generated route publishes", () => {
    const route = DOCS_ROUTES.find((entry) => entry.path === "/guide/getting-started");
    // Widened off the generated literal tuple: DOCS_ROUTES is const-asserted, so
    // matching it exactly would demand a 14-element tuple on the expected side.
    const published: readonly { id: string; title: string; level: number }[] | undefined =
      route?.headings;
    expect(published).toEqual(
      GETTING_STARTED_PAGE_HEADINGS.map(({ id, title, level }) => ({ id, title, level })),
    );
  });

  it("keeps the deleted sections deleted", () => {
    for (const gone of [
      "you-have-a-chart",
      "the-chart",
      "inspect-and-pin",
      "built-for-agents",
      "the-rest-of-the-grammar",
      "choose-another-surface-only-when-you-need-it",
      "headless-and-server-rendering",
      "validating-specs",
      "create-a-sveltekit-app",
    ]) {
      expect(COMPONENT).not.toContain(`id="${gone}"`);
    }
  });
});
