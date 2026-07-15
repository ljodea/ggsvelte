import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { checkPackedPages, findBrokenLinks, requiredPages } from "./check-pages-links.ts";

describe("packed Pages link checks", () => {
  const files = new Set([
    "index.html",
    "guide/interactions.html",
    "guide/migrating-pre-0-1.html",
    "examples/interaction/tooltip.html",
    "examples/interaction/brush-zoom.html",
    "examples/interactions/inspection.html",
    "examples/interactions/interval-selection.html",
    "llms.txt",
    "llms-full.txt",
    "_app/app.js",
  ]);

  it("resolves project-relative guide, example, endpoint, and asset links", () => {
    expect(
      findBrokenLinks(
        "guide/interactions.html",
        [
          "../examples/interaction/tooltip",
          "../guide/migrating-pre-0-1#payloads",
          "../llms.txt",
          "../_app/app.js",
          "../",
          "https://github.com/ljodea/ggsvelte",
          "#inspection",
        ],
        files,
      ),
    ).toEqual([]);
  });

  it("reports missing internal targets but ignores external protocols", () => {
    expect(
      findBrokenLinks(
        "examples/interaction/tooltip.html",
        ["../../guide/missing", "mailto:test@example.com", "data:text/plain,ok"],
        files,
      ),
    ).toEqual(["../../guide/missing"]);
  });

  it("requires both R0 examples, guides, and agent endpoints in the packed site", () => {
    for (const page of requiredPages) expect(files.has(page)).toBe(true);
    expect(requiredPages).toContain("examples/interactions/inspection.html");
    expect(requiredPages).toContain("examples/interactions/interval-selection.html");
  });

  it("reports a missing packed directory and every absent required page", () => {
    const missing = join(tmpdir(), `ggsvelte-pages-does-not-exist-${String(process.pid)}`);
    expect(checkPackedPages(missing)).toEqual([`packed Pages directory is missing: ${missing}`]);

    const empty = mkdtempSync(join(tmpdir(), "ggsvelte-pages-empty-"));
    try {
      expect(checkPackedPages(empty)).toEqual(
        requiredPages.map((page) => `missing required page: ${page}`),
      );
    } finally {
      rmSync(empty, { recursive: true });
    }
  });

  it("reports a broken link from an otherwise complete packed site", () => {
    const root = mkdtempSync(join(tmpdir(), "ggsvelte-pages-broken-"));
    try {
      for (const page of ["index.html", ...requiredPages]) {
        const absolute = join(root, page);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, page === "index.html" ? '<a href="./missing">Missing</a>' : "");
      }
      expect(checkPackedPages(root)).toContain('index.html: broken href "./missing"');
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
