import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface PagesConfig {
  schemaVersion: number;
  integration: string;
  workflow: string;
  projectName: string;
  productionBranch: string;
  buildCommand: string;
  destinationDirectory: string;
  rootDirectory: string;
  runtimes: Record<string, string>;
  environments: Record<string, Record<string, string>>;
  externalRedirects: readonly {
    source: string;
    target: string;
    status: number;
    preserveQueryString: boolean;
    subpathMatching: boolean;
    preservePathSuffix: boolean;
    includeSubdomains: boolean;
  }[];
  watchPaths: readonly string[];
}

const ROOT = join(import.meta.dir, "..");

describe("Cloudflare Pages project contract", () => {
  it("pins a GitHub Actions direct-upload build with distinct production and preview modes", () => {
    const path = join(ROOT, "apps", "docs", "deployment", "cloudflare-pages.json");
    const config = JSON.parse(readFileSync(path, "utf8")) as PagesConfig;

    expect(config).toMatchObject({
      schemaVersion: 1,
      integration: "github-actions-direct-upload",
      workflow: ".github/workflows/cloudflare-pages.yml",
      projectName: "ggsvelte",
      productionBranch: "main",
      buildCommand: "bun run build:cloudflare",
      destinationDirectory: "apps/docs/build",
      rootDirectory: "",
      runtimes: { BUN_VERSION: "1.3.14", NODE_VERSION: "22" },
      environments: {
        production: { DOCS_BUILD_MODE: "cloudflare-production" },
        preview: { DOCS_BUILD_MODE: "cloudflare-preview" },
      },
    });
    expect(config.externalRedirects).toEqual([
      {
        source: "https://ggsvelte.pages.dev",
        target: "https://ggsvelte.sh",
        status: 301,
        preserveQueryString: true,
        subpathMatching: true,
        preservePathSuffix: true,
        includeSubdomains: false,
      },
      {
        source: "https://www.ggsvelte.sh",
        target: "https://ggsvelte.sh",
        status: 301,
        preserveQueryString: true,
        subpathMatching: true,
        preservePathSuffix: true,
        includeSubdomains: false,
      },
    ]);
    expect(config.watchPaths).toEqual([
      "apps/docs/**",
      "packages/**",
      "examples/**",
      "scripts/**",
      "lifecycle.json",
      "package.json",
      "bun.lock",
      "tsconfig.json",
      "tsconfig.base.json",
      "mise.toml",
    ]);

    const workflow = readFileSync(join(ROOT, config.workflow), "utf8");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("bun run build:cloudflare");
    expect(workflow).toContain("bunx wrangler pages deploy apps/docs/build");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}");
    expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}");
    expect(workflow).toContain("ref: ${{ github.sha }}");
    expect(workflow).not.toContain("pull_request:");
  });

  it("keeps the legacy host full until the explicit migration gate", () => {
    const workflow = readFileSync(join(ROOT, ".github", "workflows", "pages.yml"), "utf8");
    expect(workflow).toContain("DOCS_BUILD_MODE: ${{ vars.DOCS_LEGACY_MODE || 'legacy-full' }}");
    expect(workflow).toContain("if: env.DOCS_BUILD_MODE == 'legacy-migration'");
    expect(workflow).toContain("bun scripts/legacy-migration.ts");
    expect(workflow).toContain("bun scripts/legacy-artifact.ts");
    expect(workflow.indexOf("git archive --format=tar origin/gh-pages bench")).toBeLessThan(
      workflow.indexOf("bun scripts/legacy-artifact.ts"),
    );
  });

  it("keeps mutable benchmark fetching out of the Cloudflare build command", () => {
    const rootPackage = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const command = rootPackage.scripts["build:cloudflare"] ?? "";
    expect(command).toContain("bun scripts/deployment-artifact.ts");
    expect(command).not.toContain("gh-pages");
    expect(command).not.toContain("git fetch");
  });
});
