/**
 * Deprecation/release-notes wiring (ADR 0013): deprecations and
 * version-bumping changesets must link users to migration guidance.
 *
 * - Every `@deprecated` JSDoc in published package sources carries
 *   "since <version>" and an absolute upgrade-guide URL whose page and
 *   anchor really exist (anchors come from the same renderer the docs site
 *   uses — never a re-derived slug algorithm).
 * - Every pending changeset with a minor or major bump for a published
 *   package carries an explicit `Migration:` line — either a resolving
 *   guide URL or the literal "none — additive". An explicit marker, not
 *   prose keyword sniffing: additive minors must say so.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { LifecycleDoc } from "./gen-llms.ts";
import { guidePages, renderMarkdown } from "./gen-llms.ts";

const ROOT = join(import.meta.dir, "..");
const GUIDE_URL_BASE = "https://ljodea.github.io/ggsvelte/guide/";

const lifecycle = JSON.parse(readFileSync(join(ROOT, "lifecycle.json"), "utf8")) as LifecycleDoc;

/** slug → set of heading anchors rendered by the docs site. */
function guideAnchors(): Map<string, Set<string>> {
  const anchors = new Map<string, Set<string>>();
  for (const page of guidePages(lifecycle)) {
    const ids = [...renderMarkdown(page.markdown).matchAll(/<h\d id="([^"]+)"/g)].map(
      (match) => match[1]!,
    );
    anchors.set(page.slug, new Set(ids));
  }
  return anchors;
}

function assertGuideUrlResolves(url: string, context: string): void {
  const anchors = guideAnchors();
  expect(url, `${context}: migration links must use ${GUIDE_URL_BASE}`).toStartWith(GUIDE_URL_BASE);
  const [slug = "", fragment] = url.slice(GUIDE_URL_BASE.length).split("#");
  expect([...anchors.keys()], `${context}: unknown guide page "${slug}"`).toContain(slug);
  if (fragment !== undefined) {
    expect(
      [...(anchors.get(slug) ?? [])],
      `${context}: anchor #${fragment} missing from guide/${slug}`,
    ).toContain(fragment);
  }
}

function* walkSources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSources(path);
    else if (/\.(ts|svelte)$/.test(entry.name) && !entry.name.includes(".test.")) yield path;
  }
}

/** The full JSDoc block around each `@deprecated` occurrence in a file. */
function deprecatedBlocks(source: string): string[] {
  const blocks: string[] = [];
  for (const match of source.matchAll(/@deprecated/g)) {
    const start = source.lastIndexOf("/**", match.index);
    const end = source.indexOf("*/", match.index);
    blocks.push(start === -1 || end === -1 ? "" : source.slice(start, end + 2));
  }
  return blocks;
}

describe("deprecated surfaces link migration guidance", () => {
  const packages = ["spec", "core", "svelte"];

  it("every @deprecated tag carries since-version and a resolving guide link", () => {
    for (const pkg of packages) {
      for (const file of walkSources(join(ROOT, "packages", pkg, "src"))) {
        for (const block of deprecatedBlocks(readFileSync(file, "utf8"))) {
          const context = `${file} deprecated block`;
          expect(block, `${context}: needs "since <version>"`).toMatch(/since \d+\.\d+\.\d+/i);
          const url = /https:\/\/\S+/.exec(block)?.[0];
          expect(url, `${context}: needs an absolute guide URL`).toBeDefined();
          assertGuideUrlResolves(url!, context);
        }
      }
    }
  });
});

describe("version-bumping changesets carry an explicit migration marker", () => {
  const changesetDir = join(ROOT, ".changeset");
  const changesets = readdirSync(changesetDir).filter(
    (name) => name.endsWith(".md") && name !== "README.md",
  );

  it("every minor/major changeset states its migration story", () => {
    for (const name of changesets) {
      const body = readFileSync(join(changesetDir, name), "utf8");
      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(body)?.[1] ?? "";
      const bumps = [...frontmatter.matchAll(/"@ggsvelte\/[^"]+":\s*(minor|major)/g)];
      if (bumps.length === 0) continue;
      const context = `.changeset/${name}`;
      const marker = /Migration: (\S[^\n]*)/.exec(body)?.[1];
      expect(
        marker,
        `${context}: minor/major changesets need "Migration: <guide URL>" or "Migration: none — additive"`,
      ).toBeDefined();
      if (marker! !== "none — additive") {
        // Changeset URLs use markdown autolink form (<https://…>) — MD034.
        assertGuideUrlResolves(marker!.trim().replaceAll(/^<|>$/g, ""), context);
      }
    }
  });
});
