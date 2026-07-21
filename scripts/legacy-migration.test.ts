import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { applyLegacyMigration, renderLegacyMigrationPage } from "./legacy-migration.ts";

const route = {
  sourcePath: "/examples/old",
  destinationPath: "/examples/current",
  kind: "alias",
  sources: ["alias", "live-crawl"],
} as const;

describe("legacy GitHub Pages migration", () => {
  it("renders a fixed-origin, visible, noindex migration that preserves query and fragment in JavaScript", () => {
    const html = renderLegacyMigrationPage(route);

    expect(html).toContain('<meta name="robots" content="noindex,follow">');
    expect(html).toContain('<link rel="canonical" href="https://ggsvelte.sh/examples/current">');
    expect(html).toContain(
      '<meta http-equiv="refresh" content="0;url=https://ggsvelte.sh/examples/current">',
    );
    expect(html).toContain('<a href="https://ggsvelte.sh/examples/current">');
    expect(html).toContain("location.search + location.hash");
    expect(html).toContain('location.replace("https://ggsvelte.sh/examples/current" + suffix);');
    expect(html).not.toContain("URLSearchParams");
  });

  it("replaces known HTML, preserves endpoint and benchmark files, and writes an unknown-path fallback", () => {
    const buildDirectory = mkdtempSync(join(tmpdir(), "ggsvelte-legacy-migration-"));
    try {
      mkdirSync(join(buildDirectory, "examples"), { recursive: true });
      mkdirSync(join(buildDirectory, "schema"), { recursive: true });
      mkdirSync(join(buildDirectory, "bench"), { recursive: true });
      writeFileSync(join(buildDirectory, "examples", "old.html"), "old docs");
      writeFileSync(join(buildDirectory, "schema", "v0.json"), '{"schema":true}');
      writeFileSync(join(buildDirectory, "bench", "index.html"), "benchmark history");

      applyLegacyMigration(buildDirectory, {
        schemaVersion: 1,
        sourceOrigin: "https://ljodea.github.io/ggsvelte",
        destinationOrigin: "https://ggsvelte.sh",
        crawledAt: "2026-07-21",
        benchmarkPrefix: "/bench",
        routes: [
          route,
          {
            sourcePath: "/schema/v0.json",
            destinationPath: "/schema/v0.json",
            kind: "endpoint",
            sources: ["canonical"],
          },
        ],
      });

      expect(readFileSync(join(buildDirectory, "examples", "old.html"), "utf8")).toContain(
        "https://ggsvelte.sh/examples/current",
      );
      expect(readFileSync(join(buildDirectory, "schema", "v0.json"), "utf8")).toBe(
        '{"schema":true}',
      );
      expect(readFileSync(join(buildDirectory, "bench", "index.html"), "utf8")).toBe(
        "benchmark history",
      );
      const notFound = readFileSync(join(buildDirectory, "404.html"), "utf8");
      expect(notFound).toContain("This old documentation path was not found");
      expect(notFound).not.toContain("location.replace");
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });
});
