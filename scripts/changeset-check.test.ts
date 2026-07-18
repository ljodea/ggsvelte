import { describe, expect, it } from "bun:test";

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  COMMENT_MARKER,
  decideChangesetComment,
  discoverPublishedPackages,
  renderComment,
} from "./changeset-check";

const root = join(import.meta.dir, "..");

/** Fixture mirroring the real published workspace shape (see discovery test). */
const PACKAGES = [
  { dir: "packages/core", name: "@ggsvelte/core", shipped: ["dist", "src"] },
  { dir: "packages/spec", name: "@ggsvelte/spec", shipped: ["dist", "schema", "src"] },
  { dir: "packages/svelte", name: "@ggsvelte/svelte", shipped: ["dist", "bin", "skills"] },
];

describe("decideChangesetComment", () => {
  it("reports changeset-present when the PR adds a changeset file", () => {
    const decision = decideChangesetComment(
      [".changeset/my-change.md", "packages/core/src/scales.ts"],
      PACKAGES,
    );
    expect(decision.verdict).toBe("changeset-present");
  });

  it("reports missing when shipped package code changes without a changeset", () => {
    const decision = decideChangesetComment(
      ["packages/core/src/scales.ts", "packages/svelte/bin/ggsvelte-render.js", "README.md"],
      PACKAGES,
    );
    expect(decision.verdict).toBe("missing");
    expect(decision.touched).toEqual([
      "packages/core/src/scales.ts",
      "packages/svelte/bin/ggsvelte-render.js",
    ]);
  });

  it("treats a published package.json change as shipped surface", () => {
    const decision = decideChangesetComment(["packages/svelte/package.json"], PACKAGES);
    expect(decision.verdict).toBe("missing");
    expect(decision.touched).toEqual(["packages/svelte/package.json"]);
  });

  it("stays quiet for changes outside shipped package surfaces", () => {
    const decision = decideChangesetComment(
      [
        "apps/docs/src/routes/+page.svelte",
        "packages/core/tests/scales.test.ts",
        "packages/svelte/vitest.config.ts",
        "packages/spec/README.md",
        "packages/spec/CHANGELOG.md",
        ".github/workflows/ci.yml",
        "scripts/ci-routing.ts",
      ],
      PACKAGES,
    );
    expect(decision.verdict).toBe("not-needed");
  });

  it("stays quiet for test files colocated inside shipped dirs", () => {
    const decision = decideChangesetComment(
      ["packages/core/src/scales.test.ts", "packages/spec/src/lint.spec.ts"],
      PACKAGES,
    );
    expect(decision.verdict).toBe("not-needed");
  });

  it("does not count .changeset/README.md as a changeset", () => {
    const decision = decideChangesetComment(
      [".changeset/README.md", "packages/core/src/scales.ts"],
      PACKAGES,
    );
    expect(decision.verdict).toBe("missing");
  });
});

describe("changeset-check workflow wiring", () => {
  const workflow = readFileSync(join(root, ".github/workflows/changeset-check.yml"), "utf8");

  it("routes the PR diff through the tested script", () => {
    expect(workflow).toContain("bun scripts/changeset-check.ts emit --stdin");
  });

  it("can write PR comments but nothing else", () => {
    expect(workflow).toContain("permissions: {}");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain("persist-credentials: false");
  });

  it("skips the bot's own Version Packages PR and fork PRs", () => {
    expect(workflow).toContain("changeset-release/main");
    expect(workflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
  });

  it("stays non-blocking and syncs one sticky comment via the shared marker", () => {
    expect(workflow).not.toContain("exit 1");
    expect(workflow).toContain(COMMENT_MARKER);
  });
});

describe("emit CLI", () => {
  it("writes the verdict to GITHUB_OUTPUT and the comment body to --body-out", () => {
    const dir = mkdtempSync(join(tmpdir(), "changeset-check-"));
    const outputFile = join(dir, "github-output");
    const bodyFile = join(dir, "comment.md");
    writeFileSync(outputFile, "");
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        join(root, "scripts/changeset-check.ts"),
        "emit",
        "--stdin",
        "--body-out",
        bodyFile,
      ],
      stdin: Buffer.from("packages/core/src/scales.ts\n"),
      env: { ...process.env, GITHUB_OUTPUT: outputFile },
    });
    expect(result.exitCode).toBe(0);
    expect(readFileSync(outputFile, "utf8")).toContain("verdict=missing");
    expect(readFileSync(bodyFile, "utf8")).toContain("packages/core/src/scales.ts");
  });
});

describe("discoverPublishedPackages", () => {
  it("finds exactly the npm-published workspace packages with their shipped dirs", () => {
    // Real-repo fixture: if a package is added, made private, or reshapes its
    // npm `files`, this test is the reminder to reconfirm the check's scope.
    expect(discoverPublishedPackages(root)).toEqual(PACKAGES);
  });
});

describe("renderComment", () => {
  it("explains a missing changeset without blocking, and lists touched files", () => {
    const body = renderComment({
      verdict: "missing",
      touched: ["packages/core/src/scales.ts", "packages/core/src/theme.ts"],
    });
    expect(body).toContain(COMMENT_MARKER);
    expect(body).toContain("bun changeset");
    expect(body).toContain("packages/core/src/scales.ts");
    expect(body).toContain("not block");
  });

  it("caps the touched-file listing at 10 and reports the remainder", () => {
    const touched = Array.from({ length: 14 }, (_, i) => `packages/core/src/mod-${i}.ts`);
    const body = renderComment({ verdict: "missing", touched });
    expect(body).toContain("packages/core/src/mod-9.ts");
    expect(body).not.toContain("packages/core/src/mod-10.ts");
    expect(body).toContain("4 more");
  });

  it("acknowledges a changeset once one is added", () => {
    const body = renderComment({ verdict: "changeset-present", touched: [] });
    expect(body).toContain(COMMENT_MARKER);
    expect(body).toContain("Changeset detected");
  });

  it("marks internal-only PRs as needing nothing", () => {
    const body = renderComment({ verdict: "not-needed", touched: [] });
    expect(body).toContain(COMMENT_MARKER);
    expect(body).toContain("No changeset needed");
  });
});
