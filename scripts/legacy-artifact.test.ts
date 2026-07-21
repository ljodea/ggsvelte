import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildLegacyArtifactIdentity } from "./legacy-artifact.ts";

const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const BENCHMARK_COMMIT = "89abcdef0123456789abcdef0123456789abcdef";

describe("legacy deployment artifact identity", () => {
  it("binds the migration to source, frozen routes, and exact benchmark bytes", () => {
    const buildDirectory = mkdtempSync(join(tmpdir(), "ggsvelte-legacy-artifact-"));
    try {
      mkdirSync(join(buildDirectory, "bench"));
      writeFileSync(join(buildDirectory, "bench", "data.js"), "const value = 1;\n");
      writeFileSync(join(buildDirectory, "bench", "index.html"), "<h1>Bench</h1>\n");

      expect(
        buildLegacyArtifactIdentity({
          sourceCommit: SOURCE_COMMIT,
          benchmarkCommit: BENCHMARK_COMMIT,
          buildMode: "legacy-migration",
          legacyRoutesJson: '{"schemaVersion":1,"routes":[]}\n',
          benchmarkDirectory: join(buildDirectory, "bench"),
        }),
      ).toEqual({
        schemaVersion: 1,
        sourceCommit: SOURCE_COMMIT,
        buildMode: "legacy-migration",
        legacyRoutesSha256: "f815268ae57353c881268708f084da262ffb522f411b51c59ad1c8a397c17786",
        benchmarkCommit: BENCHMARK_COMMIT,
        benchmarkSha256: "c1710b6d76402fe655f216e097e83b80b1602070f316d1707c0c3ec489744531",
      });
    } finally {
      rmSync(buildDirectory, { recursive: true, force: true });
    }
  });
});
