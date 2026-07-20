import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DocsBuildConfig } from "../apps/docs/build-mode.ts";
import sveltePackage from "../packages/svelte/package.json";
import { validateDocsBuildMetadata } from "./check-docs-metadata.ts";
import type { DocsRouteRecord } from "./docs-route-inventory.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const config: DocsBuildConfig = {
  mode: "cloudflare-production",
  base: "",
  canonicalBase: "https://ggsvelte.sh",
  indexable: true,
  analytics: true,
};
const route: DocsRouteRecord = {
  path: "/",
  title: "Home — ggsvelte",
  description: "A distinct description.",
  canonicalPath: "/",
  kind: "page",
  index: true,
  sitemap: true,
  shell: "site",
};

function fixture(html: string): string {
  const root = mkdtempSync(join(tmpdir(), "ggsvelte-metadata-"));
  roots.push(root);
  writeFileSync(join(root, "index.html"), html);
  writeFileSync(
    join(root, "sitemap.xml"),
    '<?xml version="1.0"?><urlset><url><loc>https://ggsvelte.sh/</loc></url></urlset>',
  );
  writeFileSync(
    join(root, "robots.txt"),
    "User-agent: *\nAllow: /\nSitemap: https://ggsvelte.sh/sitemap.xml\n",
  );
  const facts = [
    `Package version: ${sveltePackage.version}`,
    "Defaults edition: 2",
    "Registered chart themes (12): default, light, dark, minimal, ggplot2, classic, hrbr, few, clean, fivethirtyeight, economist, tufte",
    "[Docs](https://ggsvelte.sh/docs)",
  ].join("\n");
  writeFileSync(join(root, "llms.txt"), facts);
  writeFileSync(join(root, "llms-full.txt"), facts);
  return root;
}

function socialHead(structured = true): string {
  const data = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ggsvelte",
      url: "https://ggsvelte.sh/",
      description: "A distinct description.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: "ggsvelte",
      codeRepository: "https://github.com/ljodea/ggsvelte",
      programmingLanguage: ["TypeScript", "Svelte"],
      license: "https://spdx.org/licenses/MIT.html",
      runtimePlatform: "Node.js 22 or newer",
      url: "https://ggsvelte.sh/",
      version: sveltePackage.version,
    },
  ]);
  return [
    "<title>Home — ggsvelte</title>",
    '<meta name="description" content="A distinct description."/>',
    '<link rel="canonical" href="https://ggsvelte.sh/"/>',
    '<meta property="og:site_name" content="ggsvelte"/>',
    '<meta property="og:type" content="website"/>',
    '<meta property="og:title" content="Home — ggsvelte"/>',
    '<meta property="og:description" content="A distinct description."/>',
    '<meta property="og:url" content="https://ggsvelte.sh/"/>',
    '<meta property="og:image" content="https://ggsvelte.sh/previews/interaction-tooltip-light.png"/>',
    '<meta property="og:image:width" content="640"/>',
    '<meta property="og:image:height" content="400"/>',
    '<meta property="og:image:alt" content="An interactive ggsvelte scatter plot with a pinned data inspection."/>',
    '<meta name="twitter:card" content="summary_large_image"/>',
    '<meta name="twitter:title" content="Home — ggsvelte"/>',
    '<meta name="twitter:description" content="A distinct description."/>',
    '<meta name="twitter:image" content="https://ggsvelte.sh/previews/interaction-tooltip-light.png"/>',
    '<meta name="twitter:image:alt" content="An interactive ggsvelte scatter plot with a pinned data inspection."/>',
    structured ? `<script type="application/ld+json">${data}</script>` : "",
  ].join("");
}

describe("built docs metadata", () => {
  it("rejects relative or wrong-origin links in generated LLM discovery files", () => {
    const root = fixture(`<html><head>${socialHead()}</head><body></body></html>`);
    writeFileSync(join(root, "llms.txt"), "[Docs](/docs)");

    expect(() => {
      validateDocsBuildMetadata(root, config, [route]);
    }).toThrow("llms.txt");
  });

  it("rejects a public home page that omits required structured data", () => {
    const root = fixture(`<html><head>${socialHead(false)}</head><body></body></html>`);

    expect(() => {
      validateDocsBuildMetadata(root, config, [route]);
    }).toThrow("structured data");
  });

  it("rejects a public page that omits social metadata", () => {
    const root = fixture(
      '<html><head><title>Home — ggsvelte</title><meta name="description" content="A distinct description."/><link rel="canonical" href="https://ggsvelte.sh/"/></head><body></body></html>',
    );

    expect(() => {
      validateDocsBuildMetadata(root, config, [route]);
    }).toThrow("social metadata");
  });
});
