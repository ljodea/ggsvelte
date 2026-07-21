import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveDocsBuildConfig } from "../apps/docs/build-mode.ts";
import { createDocsRouteInventory } from "./docs-route-inventory.ts";

export type DeploymentBuildMode = "cloudflare-preview" | "cloudflare-production";

export interface DeploymentRoute {
  readonly path: string;
  readonly canonicalPath: string;
  readonly kind: string;
  readonly index: boolean;
  readonly sitemap: boolean;
}

export interface DeploymentIdentity {
  readonly schemaVersion: 1;
  readonly sourceCommit: string;
  readonly routeInventorySha256: string;
  readonly buildMode: DeploymentBuildMode;
}

const COMMIT_SHA = /^[0-9a-f]{40}$/;
const REQUIRED_SECURITY_HEADERS = [
  "Content-Security-Policy-Report-Only:",
  "Permissions-Policy:",
  "Referrer-Policy: strict-origin-when-cross-origin",
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: DENY",
] as const;

const REQUIRED_DEPLOYMENT_FILES = [
  "index.html",
  "404.html",
  "_headers",
  "_redirects",
  "robots.txt",
  "sitemap.xml",
  "artifact.json",
] as const;

export function routeInventoryDigest(routes: readonly DeploymentRoute[]): string {
  const inventory = routes
    .map((route) =>
      [
        route.path,
        route.canonicalPath,
        route.kind,
        route.index ? "index" : "noindex",
        route.sitemap ? "sitemap" : "no-sitemap",
      ].join("\0"),
    )
    .join("\n");
  return createHash("sha256").update(`${inventory}\n`).digest("hex");
}

function listFiles(root: string, directory = root): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    return statSync(absolute).isDirectory()
      ? listFiles(root, absolute)
      : [absolute.slice(root.length + 1)];
  });
}

export interface DeploymentExpectation {
  readonly sourceCommit: string;
  readonly buildMode: DeploymentBuildMode;
  readonly routes: readonly DeploymentRoute[];
  readonly analyticsToken?: string;
}

export function ensureNotFoundNoindex(buildDirectory: string): void {
  const path = join(buildDirectory, "404.html");
  const html = readFileSync(path, "utf8");
  if (html.includes('name="robots" content="noindex')) return;
  if (!html.includes("</head>")) throw new Error("404.html is missing its closing head tag");
  writeFileSync(
    path,
    html.replace("</head>", '    <meta name="robots" content="noindex,follow" />\n  </head>'),
  );
}

export function ensurePreviewNoindexHeader(
  buildDirectory: string,
  buildMode: DeploymentBuildMode,
): void {
  if (buildMode !== "cloudflare-preview") return;
  const path = join(buildDirectory, "_headers");
  const headers = readFileSync(path, "utf8");
  if (headers.includes("X-Robots-Tag: noindex")) return;
  if (!headers.startsWith("/*\n")) {
    throw new Error("_headers must begin with the broad /* route before preview noindex injection");
  }
  writeFileSync(path, headers.replace("/*\n", "/*\n  X-Robots-Tag: noindex, nofollow\n"));
}

export function validateDeploymentArtifact(
  buildDirectory: string,
  expected: DeploymentExpectation,
): string[] {
  const problems = REQUIRED_DEPLOYMENT_FILES.filter(
    (path) => !existsSync(join(buildDirectory, path)),
  ).map((path) => `missing required deployment file: ${path}`);
  for (const path of listFiles(buildDirectory, join(buildDirectory, "bench"))) {
    problems.push(`Cloudflare artifact must not contain mutable benchmark history: ${path}`);
  }

  let hasAnalyticsBeacon = false;
  let hasExpectedAnalyticsToken = false;
  for (const path of listFiles(buildDirectory).filter((file) => file.endsWith(".html"))) {
    const html = readFileSync(join(buildDirectory, path), "utf8");
    if (/\b(?:href|src)=["']https:\/\/ljodea\.github\.io\/ggsvelte(?:\/|["'])/i.test(html)) {
      problems.push(`${path} leaks the legacy documentation origin`);
    }
    if (/\b(?:href|src)=["']\/ggsvelte(?:\/|["'])/i.test(html)) {
      problems.push(`${path} contains a /ggsvelte project-base URL`);
    }
    if (html.includes("https://static.cloudflareinsights.com/beacon.min.js")) {
      hasAnalyticsBeacon = true;
      if (expected.analyticsToken !== undefined && html.includes(expected.analyticsToken)) {
        hasExpectedAnalyticsToken = true;
      }
    }
  }
  const notFoundPath = join(buildDirectory, "404.html");
  if (
    existsSync(notFoundPath) &&
    !readFileSync(notFoundPath, "utf8").includes('name="robots" content="noindex')
  ) {
    problems.push("404.html must contain a noindex robots policy");
  }

  if (expected.buildMode === "cloudflare-preview" && hasAnalyticsBeacon) {
    problems.push("preview artifact must not contain the Cloudflare Web Analytics beacon");
  }
  if (
    expected.buildMode === "cloudflare-production" &&
    expected.analyticsToken !== undefined &&
    (!hasAnalyticsBeacon || !hasExpectedAnalyticsToken)
  ) {
    problems.push("production artifact is missing the configured Cloudflare Web Analytics beacon");
  }

  const headersPath = join(buildDirectory, "_headers");
  if (existsSync(headersPath)) {
    const headers = readFileSync(headersPath, "utf8");
    for (const policy of REQUIRED_SECURITY_HEADERS) {
      if (!headers.includes(policy)) {
        problems.push(`_headers is missing required security policy: ${policy}`);
      }
    }
    if (!headers.includes("Cache-Control: public, max-age=0, must-revalidate")) {
      problems.push("_headers must revalidate public HTML and metadata");
    }
    if (
      expected.buildMode === "cloudflare-preview" &&
      !headers.includes("/*\n  X-Robots-Tag: noindex")
    ) {
      problems.push("preview _headers must apply X-Robots-Tag: noindex to every route");
    }
    if (
      !headers.includes("/_app/immutable/*") ||
      !headers.includes("Cache-Control: public, max-age=31536000, immutable")
    ) {
      problems.push("_headers must cache only SvelteKit immutable assets for one year");
    }
    if (!headers.includes("/_app/immutable/*\n  ! Cache-Control\n")) {
      problems.push("_headers must detach the inherited HTML cache policy from immutable assets");
    }
  }

  const redirectsPath = join(buildDirectory, "_redirects");
  if (existsSync(redirectsPath)) {
    const redirects = readFileSync(redirectsPath, "utf8");
    if (/^https:\/\/\S+\s+/m.test(redirects)) {
      problems.push("_redirects must not contain unsupported domain-level source URLs");
    }
    if (!redirects.includes("/bench/* https://ljodea.github.io/ggsvelte/bench/:splat 302")) {
      problems.push("_redirects is missing the fixed legacy benchmark redirect");
    }
    if (!redirects.includes("/ggsvelte/* /:splat 301")) {
      problems.push("_redirects is missing the /ggsvelte cleanup redirect");
    }
  }

  const identityPath = join(buildDirectory, "artifact.json");
  if (existsSync(identityPath)) {
    let actual: unknown;
    try {
      actual = JSON.parse(readFileSync(identityPath, "utf8"));
    } catch {
      problems.push("artifact.json is not valid JSON");
    }
    if (
      actual !== undefined &&
      JSON.stringify(actual) !== JSON.stringify(buildDeploymentIdentity(expected))
    ) {
      problems.push("artifact.json does not match the expected source, routes, and build mode");
    }
  }
  return problems;
}

export function buildDeploymentIdentity(input: {
  readonly sourceCommit: string;
  readonly buildMode: DeploymentBuildMode;
  readonly routes: readonly DeploymentRoute[];
}): DeploymentIdentity {
  if (!COMMIT_SHA.test(input.sourceCommit)) {
    throw new Error(
      `Deployment source commit must be a lowercase 40-character SHA: ${input.sourceCommit}`,
    );
  }
  return {
    schemaVersion: 1,
    sourceCommit: input.sourceCommit,
    routeInventorySha256: routeInventoryDigest(input.routes),
    buildMode: input.buildMode,
  };
}

function sourceCommit(): string {
  return (
    process.env["CF_PAGES_COMMIT_SHA"] ??
    process.env["GITHUB_SHA"] ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  );
}

export function deploymentBuildConfig(environment: Readonly<Record<string, string | undefined>>) {
  return resolveDocsBuildConfig({
    ...(environment["DOCS_BUILD_MODE"] === undefined
      ? {}
      : { mode: environment["DOCS_BUILD_MODE"] }),
    ...(environment["BASE_PATH"] === undefined ? {} : { basePath: environment["BASE_PATH"] }),
    ...(environment["DOCS_ANALYTICS_TOKEN"] === undefined
      ? {}
      : { analyticsToken: environment["DOCS_ANALYTICS_TOKEN"] }),
  });
}

function main(): void {
  const config = deploymentBuildConfig(process.env);
  if (config.mode !== "cloudflare-preview" && config.mode !== "cloudflare-production") {
    throw new Error(
      `Deployment artifact generation requires a Cloudflare build mode, received ${config.mode}`,
    );
  }

  const buildDirectory = join(import.meta.dir, "..", "apps", "docs", "build");
  const expected: DeploymentExpectation = {
    sourceCommit: sourceCommit(),
    buildMode: config.mode,
    routes: createDocsRouteInventory(),
    ...(config.analyticsToken === null ? {} : { analyticsToken: config.analyticsToken }),
  };
  ensureNotFoundNoindex(buildDirectory);
  ensurePreviewNoindexHeader(buildDirectory, config.mode);
  writeFileSync(
    join(buildDirectory, "artifact.json"),
    `${JSON.stringify(buildDeploymentIdentity(expected), null, 2)}\n`,
  );
  const problems = validateDeploymentArtifact(buildDirectory, expected);
  if (problems.length > 0) {
    throw new Error(
      `Cloudflare deployment artifact is invalid:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`,
    );
  }
  console.log(
    `Cloudflare artifact is valid for ${config.mode} at ${expected.sourceCommit.slice(0, 12)}.`,
  );
}

if (import.meta.main) main();
