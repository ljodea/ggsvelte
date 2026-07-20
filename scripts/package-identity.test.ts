import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const packagePaths = [
  "packages/spec/package.json",
  "packages/core/package.json",
  "packages/svelte/package.json",
] as const;

type PublishedManifest = {
  name: string;
  version: string;
  homepage?: string;
  repository?: { type?: string; url?: string; directory?: string };
};

function manifest(path: string): PublishedManifest {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as PublishedManifest;
}

describe("published package identity", () => {
  it("points each package at the live docs and its exact monorepo directory", () => {
    const manifests = packagePaths.map((path) => manifest(path));

    const versions = manifests.map(({ version }) => version);
    expect(new Set(versions).size).toBe(1);
    expect(versions[0]).toMatch(/^\d+\.\d+\.\d+$/);
    for (const [index, entry] of manifests.entries()) {
      expect(entry.homepage).toBe("https://ljodea.github.io/ggsvelte/");
      expect(entry.repository).toEqual({
        type: "git",
        url: "git+https://github.com/ljodea/ggsvelte.git",
        directory: packagePaths[index]!.replace("/package.json", ""),
      });
    }
  });
});
