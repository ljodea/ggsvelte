import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  changelogSectionForVersion,
  filterUnpublished,
  formatUnpublishedFailure,
  npmVersionUrl,
  parseNewTags,
  readPublishedPackageVersions,
  type PackageVersion,
} from "./npm-publish-state";

const root = join(import.meta.dir, "..");

describe("readPublishedPackageVersions", () => {
  it("returns the four lockstep packages with name+version", () => {
    const pkgs = readPublishedPackageVersions(root);
    const names = pkgs.map((p) => p.name).toSorted();
    expect(names).toEqual([
      "@ggsvelte/cli",
      "@ggsvelte/core",
      "@ggsvelte/spec",
      "@ggsvelte/svelte",
    ]);
    for (const pkg of pkgs) {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(pkg.dir.startsWith("packages/")).toBe(true);
    }
  });
});

describe("npmVersionUrl", () => {
  it("encodes scoped package names for the registry path", () => {
    expect(npmVersionUrl("@ggsvelte/core", "0.24.1")).toBe(
      "https://registry.npmjs.org/@ggsvelte%2Fcore/0.24.1",
    );
  });

  it("leaves unscoped names alone", () => {
    expect(npmVersionUrl("left-pad", "1.0.0", "https://example.test/")).toBe(
      "https://example.test/left-pad/1.0.0",
    );
  });
});

describe("filterUnpublished", () => {
  const local: PackageVersion[] = [
    { dir: "packages/core", name: "@ggsvelte/core", version: "0.24.1" },
    { dir: "packages/spec", name: "@ggsvelte/spec", version: "0.24.1" },
  ];

  it("returns packages whose name@version is not in the published set", () => {
    const published = new Set(["@ggsvelte/core@0.24.1"]);
    expect(filterUnpublished(local, published)).toEqual([
      { dir: "packages/spec", name: "@ggsvelte/spec", version: "0.24.1" },
    ]);
  });

  it("returns empty when everything is published", () => {
    const published = new Set(["@ggsvelte/core@0.24.1", "@ggsvelte/spec@0.24.1"]);
    expect(filterUnpublished(local, published)).toEqual([]);
  });
});

describe("parseNewTags", () => {
  it("extracts scoped and unscoped tags from changeset publish output", () => {
    const stdout = `
🦋  info npm info @ggsvelte/core
New tag: @ggsvelte/core@0.24.1
New tag: @ggsvelte/spec@0.24.1
Creating git tags...
New tag:  left-pad@1.0.0
`;
    expect(parseNewTags(stdout)).toEqual([
      "@ggsvelte/core@0.24.1",
      "@ggsvelte/spec@0.24.1",
      "left-pad@1.0.0",
    ]);
  });

  it("returns empty when nothing was published", () => {
    expect(parseNewTags("No unpublished packages to publish\n")).toEqual([]);
  });
});

describe("changelogSectionForVersion", () => {
  const sample = `# @ggsvelte/core

## 0.24.1

### Patch Changes

- abc: fix the thing

## 0.24.0

### Patch Changes

- def: earlier
`;

  it("returns the body between this version header and the next", () => {
    expect(changelogSectionForVersion(sample, "0.24.1")).toBe(
      "### Patch Changes\n\n- abc: fix the thing",
    );
  });

  it("returns the last section when there is no following H2", () => {
    expect(changelogSectionForVersion(sample, "0.24.0")).toBe(
      "### Patch Changes\n\n- def: earlier",
    );
  });

  it("returns null when the version is absent", () => {
    expect(changelogSectionForVersion(sample, "9.9.9")).toBeNull();
  });
});

describe("formatUnpublishedFailure", () => {
  it("names every unpublished package and explains the race", () => {
    const msg = formatUnpublishedFailure([
      { dir: "packages/core", name: "@ggsvelte/core", version: "0.24.1" },
    ]);
    expect(msg).toContain("@ggsvelte/core@0.24.1");
    expect(msg).toContain("changesets/action");
    expect(msg).toContain("ERROR:");
  });
});

describe("npmVersionExists", () => {
  it("returns true on 200", async () => {
    const { npmVersionExists } = await import("./npm-publish-state");
    const fetchImpl = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    await expect(npmVersionExists("@ggsvelte/core", "0.24.0", { fetchImpl })).resolves.toBe(true);
  });

  it("returns false on 404", async () => {
    const { npmVersionExists } = await import("./npm-publish-state");
    const fetchImpl = (async () =>
      new Response("Not Found", { status: 404 })) as unknown as typeof fetch;
    await expect(npmVersionExists("@ggsvelte/core", "9.9.9", { fetchImpl })).resolves.toBe(false);
  });

  it("throws on non-404 errors so the assert cannot green on outages", async () => {
    const { npmVersionExists } = await import("./npm-publish-state");
    const fetchImpl = (async () =>
      new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(npmVersionExists("@ggsvelte/core", "0.24.0", { fetchImpl })).rejects.toThrow(
      /npm registry 500/,
    );
  });
});
