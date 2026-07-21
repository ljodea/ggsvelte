import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildDeploymentIdentity,
  deploymentBuildConfig,
  ensurePreviewNoindexHeader,
  validateDeploymentArtifact,
} from "./deployment-artifact.ts";

const REQUIRED_HEADERS = `/*
  Cache-Control: public, max-age=0, must-revalidate
  Content-Security-Policy-Report-Only: default-src 'self'
  Permissions-Policy: camera=(), geolocation=(), microphone=()
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

/_app/immutable/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
`;

const REQUIRED_REDIRECTS = `/bench https://ljodea.github.io/ggsvelte/bench/ 302
/bench/* https://ljodea.github.io/ggsvelte/bench/:splat 302
/ggsvelte / 301
/ggsvelte/* /:splat 301
`;

const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const ROUTES = [
  {
    path: "/",
    canonicalPath: "/",
    kind: "page",
    index: true,
    sitemap: true,
  },
  {
    path: "/guide/getting-started",
    canonicalPath: "/guide/getting-started",
    kind: "page",
    index: true,
    sitemap: true,
  },
] as const;

const expectedArtifact = (buildMode: "cloudflare-preview" | "cloudflare-production") => ({
  buildMode,
  sourceCommit: SOURCE_COMMIT,
  routes: ROUTES,
});

function makeCompleteArtifact(buildMode: "cloudflare-preview" | "cloudflare-production") {
  const buildDirectory = mkdtempSync(join(tmpdir(), "ggsvelte-cloudflare-artifact-"));
  for (const [path, contents] of [
    ["index.html", '<link rel="canonical" href="https://ggsvelte.sh/">'],
    ["404.html", '<meta name="robots" content="noindex,follow">Not found'],
    [
      "_headers",
      buildMode === "cloudflare-preview"
        ? REQUIRED_HEADERS.replace("/*\n", "/*\n  X-Robots-Tag: noindex, nofollow\n")
        : REQUIRED_HEADERS,
    ],
    ["_redirects", REQUIRED_REDIRECTS],
    ["robots.txt", "Sitemap: https://ggsvelte.sh/sitemap.xml"],
    ["sitemap.xml", "<loc>https://ggsvelte.sh/</loc>"],
    ["artifact.json", `${JSON.stringify(buildDeploymentIdentity(expectedArtifact(buildMode)))}\n`],
  ] as const) {
    writeFileSync(join(buildDirectory, path), contents);
  }
  return buildDirectory;
}

describe("deployment artifact identity", () => {
  it("passes the configured production analytics token into artifact validation", () => {
    expect(
      deploymentBuildConfig({
        DOCS_BUILD_MODE: "cloudflare-production",
        DOCS_ANALYTICS_TOKEN: "0123456789abcdef0123456789abcdef",
      }),
    ).toMatchObject({
      mode: "cloudflare-production",
      analytics: true,
      analyticsToken: "0123456789abcdef0123456789abcdef",
    });
  });

  it("binds a Cloudflare artifact to its source commit, route inventory, and build mode", () => {
    expect(buildDeploymentIdentity(expectedArtifact("cloudflare-production"))).toEqual({
      schemaVersion: 1,
      sourceCommit: SOURCE_COMMIT,
      routeInventorySha256: "551f91a657675079d79b86099a7e1cd00bd773952b44c4565ae3154084fe56bc",
      buildMode: "cloudflare-production",
    });
  });

  it("accepts a complete reproducible Cloudflare artifact", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-production");
    try {
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-production")),
      ).toEqual([]);
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("rejects mutable benchmark history in the Cloudflare artifact", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-production");
    try {
      mkdirSync(join(buildDirectory, "bench"));
      writeFileSync(join(buildDirectory, "bench", "index.html"), "mutable history");
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-production")),
      ).toContain(
        "Cloudflare artifact must not contain mutable benchmark history: bench/index.html",
      );
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("rejects an incomplete Cloudflare artifact before deployment", () => {
    const buildDirectory = mkdtempSync(join(tmpdir(), "ggsvelte-cloudflare-artifact-"));
    try {
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-production")),
      ).toEqual([
        "missing required deployment file: index.html",
        "missing required deployment file: 404.html",
        "missing required deployment file: _headers",
        "missing required deployment file: _redirects",
        "missing required deployment file: robots.txt",
        "missing required deployment file: sitemap.xml",
        "missing required deployment file: artifact.json",
      ]);
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("injects a broad noindex header only into preview artifacts", () => {
    const preview = mkdtempSync(join(tmpdir(), "ggsvelte-cloudflare-preview-"));
    const production = mkdtempSync(join(tmpdir(), "ggsvelte-cloudflare-production-"));
    try {
      writeFileSync(join(preview, "_headers"), REQUIRED_HEADERS);
      writeFileSync(join(production, "_headers"), REQUIRED_HEADERS);
      ensurePreviewNoindexHeader(preview, "cloudflare-preview");
      ensurePreviewNoindexHeader(production, "cloudflare-production");
      expect(readFileSync(join(preview, "_headers"), "utf8")).toContain(
        "X-Robots-Tag: noindex, nofollow",
      );
      expect(readFileSync(join(production, "_headers"), "utf8")).not.toContain("X-Robots-Tag");
    } finally {
      rmSync(preview, { recursive: true, force: true });
      rmSync(production, { recursive: true, force: true });
    }
  });

  it("rejects preview artifacts without a broad noindex header", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-preview");
    try {
      writeFileSync(join(buildDirectory, "_headers"), REQUIRED_HEADERS);
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-preview")),
      ).toContain("preview _headers must apply X-Robots-Tag: noindex to every route");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("requires the unknown-route fallback to remain noindex", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-production");
    try {
      writeFileSync(join(buildDirectory, "404.html"), "Not found");
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-production")),
      ).toContain("404.html must contain a noindex robots policy");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("rejects missing security, cache, and fixed-destination redirect policies", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-production");
    try {
      writeFileSync(join(buildDirectory, "_headers"), "/*\n  Cache-Control: no-store\n");
      writeFileSync(join(buildDirectory, "_redirects"), "/bench /somewhere 301\n");
      const problems = validateDeploymentArtifact(
        buildDirectory,
        expectedArtifact("cloudflare-production"),
      );
      expect(problems).toContain(
        "_headers is missing required security policy: X-Content-Type-Options: nosniff",
      );
      expect(problems).toContain("_headers must revalidate public HTML and metadata");
      expect(problems).toContain(
        "_headers must cache only SvelteKit immutable assets for one year",
      );
      expect(problems).toContain("_redirects is missing the fixed legacy benchmark redirect");
      expect(problems).toContain("_redirects is missing the /ggsvelte cleanup redirect");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("requires immutable assets to detach the inherited HTML cache policy", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-production");
    try {
      writeFileSync(
        join(buildDirectory, "_headers"),
        REQUIRED_HEADERS.replace("  ! Cache-Control\n", ""),
      );
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-production")),
      ).toContain("_headers must detach the inherited HTML cache policy from immutable assets");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("rejects legacy canonical and project-base leakage from root builds", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-production");
    try {
      writeFileSync(
        join(buildDirectory, "index.html"),
        '<link rel="canonical" href="https://ljodea.github.io/ggsvelte/"><a href="/ggsvelte/docs">Docs</a>',
      );
      const problems = validateDeploymentArtifact(
        buildDirectory,
        expectedArtifact("cloudflare-production"),
      );
      expect(problems).toContain("index.html leaks the legacy documentation origin");
      expect(problems).toContain("index.html contains a /ggsvelte project-base URL");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });

  it("requires the standard beacon only for explicitly configured production builds", () => {
    const production = makeCompleteArtifact("cloudflare-production");
    const preview = makeCompleteArtifact("cloudflare-preview");
    try {
      expect(
        validateDeploymentArtifact(production, {
          ...expectedArtifact("cloudflare-production"),
          analyticsToken: "0123456789abcdef0123456789abcdef",
        }),
      ).toContain("production artifact is missing the configured Cloudflare Web Analytics beacon");
      writeFileSync(
        join(preview, "index.html"),
        '<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>',
      );
      expect(validateDeploymentArtifact(preview, expectedArtifact("cloudflare-preview"))).toContain(
        "preview artifact must not contain the Cloudflare Web Analytics beacon",
      );
    } finally {
      rmSync(production, { recursive: true, force: true });
      rmSync(preview, { recursive: true, force: true });
    }
  });

  it("rejects artifact identity that does not match the deployed source", () => {
    const buildDirectory = makeCompleteArtifact("cloudflare-preview");
    try {
      expect(
        validateDeploymentArtifact(buildDirectory, expectedArtifact("cloudflare-production")),
      ).toContain("artifact.json does not match the expected source, routes, and build mode");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });
});
