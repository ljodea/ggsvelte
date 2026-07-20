import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sveltePackage from "../packages/svelte/package.json";
import { createDocsRouteInventory } from "./docs-route-inventory.ts";
import {
  buildSeoDocument,
  renderStructuredDataScript,
  serializeStructuredData,
} from "./docs-seo.ts";

describe("generated docs SEO", () => {
  it("describes the canonical home page and repository with truthful structured data", () => {
    const home = createDocsRouteInventory().find((route) => route.path === "/")!;
    const seo = buildSeoDocument(home, "https://ggsvelte.sh");

    expect(seo).toMatchObject({
      title: "ggsvelte — layered grammar of graphics for Svelte",
      description:
        "Build publication-ready, interactive data graphics in Svelte with a layered grammar and a portable JSON specification.",
      canonical: "https://ggsvelte.sh/",
      image: {
        url: "https://ggsvelte.sh/previews/interaction-tooltip-light.png",
        width: 640,
        height: 740,
        alt: "An interactive ggsvelte scatter plot with a pinned data inspection.",
      },
      twitterCard: "summary_large_image",
    });
    const socialImage = readFileSync(
      join(
        import.meta.dir,
        "..",
        "apps",
        "docs",
        "static",
        "previews",
        "interaction-tooltip-light.png",
      ),
    );
    expect([socialImage.readUInt32BE(16), socialImage.readUInt32BE(20)]).toEqual([
      seo.image.width,
      seo.image.height,
    ]);
    expect(seo.structuredData).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ggsvelte",
        url: "https://ggsvelte.sh/",
        description:
          "Build publication-ready, interactive data graphics in Svelte with a layered grammar and a portable JSON specification.",
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
  });

  it("serializes structured data without allowing script termination", () => {
    const json = serializeStructuredData([{ name: "</script><script>alert(1)</script>" }]);

    expect(json).toBe('[{"name":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}]');
    expect(json).not.toContain("<script");
    expect(renderStructuredDataScript([{ name: "</script>" }])).toBe(
      '<script type="application/ld+json">[{"name":"\\u003c/script>"}]</script>',
    );
  });

  it("emits breadcrumbs only for routes that render the visible docs breadcrumb", () => {
    const routes = createDocsRouteInventory();
    const guide = routes.find((route) => route.path === "/guide/getting-started")!;
    const docs = routes.find((route) => route.path === "/docs")!;
    const gallery = routes.find((route) => route.path === "/examples")!;

    expect(buildSeoDocument(guide, "https://ggsvelte.sh").structuredData).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Docs",
            item: "https://ggsvelte.sh/docs",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Getting started",
            item: "https://ggsvelte.sh/guide/getting-started",
          },
        ],
      },
    ]);
    expect(buildSeoDocument(docs, "https://ggsvelte.sh").structuredData).toEqual([]);
    expect(buildSeoDocument(gallery, "https://ggsvelte.sh").structuredData).toEqual([]);
  });
});
