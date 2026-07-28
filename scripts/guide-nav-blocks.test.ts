import { describe, expect, test } from "bun:test";

import { guideNavBlocks } from "../apps/docs/src/lib/catalog/guide.ts";

describe("guideNavBlocks", () => {
  test("flattens decorative sections and keeps only Reference headed", () => {
    const blocks = guideNavBlocks([
      {
        section: "Start",
        entries: [{ path: "/guide/getting-started", label: "Getting started" }],
      },
      {
        section: "Core grammar",
        entries: [
          { path: "/guide/statistics-positions", label: "Statistics and positions" },
          { path: "/guide/scales-guides", label: "Scales and guides" },
        ],
      },
      {
        section: "Interaction",
        entries: [{ path: "/guide/interactions", label: "Interactions" }],
      },
      {
        section: "Production",
        entries: [{ path: "/guide/production", label: "Production" }],
      },
      {
        section: "Reference",
        entries: [
          { path: "/reference", label: "Reference overview" },
          { path: "/guide/errors", label: "Errors reference" },
        ],
      },
      {
        section: "Release",
        entries: [{ path: "/guide/upgrading", label: "Upgrade guide" }],
      },
    ]);

    expect(blocks).toEqual([
      {
        kind: "flat",
        key: "flat-0",
        entries: [
          { path: "/guide/getting-started", label: "Getting started" },
          { path: "/guide/statistics-positions", label: "Statistics and positions" },
          { path: "/guide/scales-guides", label: "Scales and guides" },
          { path: "/guide/interactions", label: "Interactions" },
          { path: "/guide/production", label: "Production" },
        ],
      },
      {
        kind: "section",
        section: "Reference",
        entries: [
          { path: "/reference", label: "Reference overview" },
          { path: "/guide/errors", label: "Errors reference" },
        ],
      },
      {
        kind: "flat",
        key: "flat-1",
        entries: [{ path: "/guide/upgrading", label: "Upgrade guide" }],
      },
    ]);
  });
});
