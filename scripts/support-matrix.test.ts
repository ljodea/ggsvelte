import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadSupportMatrix,
  requiredConsumerRows,
  nightlyConsumerRows,
  prDefaultConsumerRows,
  validateSupportMatrix,
} from "./support-matrix.js";

const root = join(import.meta.dir, "..");

describe("consumer support matrix", () => {
  test("PR default tier is a single Linux required row (issue #246)", () => {
    const matrix = loadSupportMatrix();
    const pr = prDefaultConsumerRows(matrix);
    expect(pr).toHaveLength(1);
    expect(pr[0]?.os).toBe("ubuntu-latest");
    expect(requiredConsumerRows(matrix).some((r) => r.os === "ubuntu-latest")).toBe(true);
  });

  test("is valid and has a bounded required/full nightly split", () => {
    const matrix = loadSupportMatrix(root);
    expect(validateSupportMatrix(matrix)).toEqual([]);
    expect(requiredConsumerRows(matrix).length).toBeGreaterThanOrEqual(4);
    expect(requiredConsumerRows(matrix).length).toBeLessThanOrEqual(6);
    expect(nightlyConsumerRows(matrix).length).toBeGreaterThan(requiredConsumerRows(matrix).length);
    expect(nightlyConsumerRows(matrix).length).toBeLessThanOrEqual(12);
  });

  test("rejects moving release boundaries out of the required/nightly tiers", () => {
    const matrix = loadSupportMatrix(root);
    const withoutRequiredNode = structuredClone(matrix);
    withoutRequiredNode.required = withoutRequiredNode.required.map((row) => ({
      ...row,
      node: "24",
    }));
    expect(validateSupportMatrix(withoutRequiredNode)).toContain(
      "required matrix must cover Node 22",
    );

    const withoutCanary = structuredClone(matrix);
    withoutCanary.nightly = withoutCanary.nightly.map((row) => ({ ...row, node: "24" }));
    expect(validateSupportMatrix(withoutCanary)).toContain("nightly matrix must cover Node 26");
  });

  test("keeps publishable manifests aligned with the declared Node and Svelte support", () => {
    const matrix = loadSupportMatrix(root);
    for (const dir of ["spec", "core", "svelte"]) {
      const manifest = JSON.parse(
        readFileSync(join(root, "packages", dir, "package.json"), "utf8"),
      ) as { engines?: { node?: string }; peerDependencies?: { svelte?: string } };
      expect(manifest.engines?.node).toBe(matrix.node.range);
      if (dir === "svelte") expect(manifest.peerDependencies?.svelte).toBe(matrix.svelte.range);
    }
  });

  test("covers every installer, Svelte boundary, supported OS, and Node boundary", () => {
    const matrix = loadSupportMatrix(root);
    const rows = [...requiredConsumerRows(matrix), ...nightlyConsumerRows(matrix)];
    expect(new Set(rows.map((row) => row.packageManager))).toEqual(
      new Set(Object.keys(matrix.packageManagers)),
    );
    expect(new Set(rows.map((row) => row.svelte))).toEqual(
      new Set([matrix.svelte.minimum, matrix.svelte.current]),
    );
    expect(new Set(rows.map((row) => row.os))).toEqual(new Set(matrix.operatingSystems));
    expect(new Set(rows.map((row) => row.node))).toEqual(
      new Set([...matrix.node.tested, matrix.node.canary]),
    );
  });

  test("keeps browser and contributor tool pins aligned", () => {
    const matrix = loadSupportMatrix(root);
    const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      packageManager: string;
      devDependencies: Record<string, string>;
    };
    const svelteManifest = JSON.parse(
      readFileSync(join(root, "packages/svelte/package.json"), "utf8"),
    ) as { devDependencies: Record<string, string> };
    const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    expect(rootManifest.packageManager).toBe(`bun@${matrix.packageManagers.bun}`);
    expect(rootManifest.devDependencies["@playwright/test"]).toBe(matrix.browsers.playwright);
    expect(rootManifest.devDependencies.pnpm).toBe(matrix.packageManagers.pnpm);
    expect(svelteManifest.devDependencies.playwright).toBe(matrix.browsers.playwright);
    expect(ci).toContain(`PLAYWRIGHT_CONTAINER_TAG: v${matrix.browsers.playwright}-noble`);
  });

  test("keeps the README support claim aligned with the matrix", () => {
    const matrix = loadSupportMatrix(root);
    const readme = readFileSync(join(root, "README.md"), "utf8");
    const svelteFloorLabel = matrix.svelte.minimum.replace(/\.0$/, "");
    expect(readme).toContain(
      `Requires Node.js ${matrix.node.tested[0]}+ and Svelte ${svelteFloorLabel}+.`,
    );
  });
});
