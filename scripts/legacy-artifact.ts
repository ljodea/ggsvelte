import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { resolveDocsBuildConfig } from "../apps/docs/build-mode.ts";

export type LegacyBuildMode = "legacy-full" | "legacy-migration";

export interface LegacyArtifactIdentity {
  readonly schemaVersion: 1;
  readonly sourceCommit: string;
  readonly buildMode: LegacyBuildMode;
  readonly legacyRoutesSha256: string;
  readonly benchmarkCommit: string;
  readonly benchmarkSha256: string;
}

const COMMIT_SHA = /^[0-9a-f]{40}$/;

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function listFiles(root: string, directory = root): string[] {
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    return statSync(absolute).isDirectory() ? listFiles(root, absolute) : [absolute];
  });
}

export function benchmarkDirectoryDigest(directory: string): string {
  if (!existsSync(directory)) throw new Error(`Benchmark directory is missing: ${directory}`);
  const manifest = listFiles(directory)
    .map(
      (path) =>
        [relative(directory, path).split(sep).join("/"), sha256(readFileSync(path))] as const,
    )
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, digest]) => `${path}\0${digest}\n`)
    .join("");
  return sha256(manifest);
}

export function buildLegacyArtifactIdentity(input: {
  readonly sourceCommit: string;
  readonly benchmarkCommit: string;
  readonly buildMode: LegacyBuildMode;
  readonly legacyRoutesJson: string;
  readonly benchmarkDirectory: string;
}): LegacyArtifactIdentity {
  for (const [name, value] of [
    ["source", input.sourceCommit],
    ["benchmark", input.benchmarkCommit],
  ] as const) {
    if (!COMMIT_SHA.test(value)) {
      throw new Error(`Legacy ${name} commit must be a lowercase 40-character SHA: ${value}`);
    }
  }
  return {
    schemaVersion: 1,
    sourceCommit: input.sourceCommit,
    buildMode: input.buildMode,
    legacyRoutesSha256: sha256(input.legacyRoutesJson),
    benchmarkCommit: input.benchmarkCommit,
    benchmarkSha256: benchmarkDirectoryDigest(input.benchmarkDirectory),
  };
}

function main(): void {
  const config = resolveDocsBuildConfig({
    mode: process.env["DOCS_BUILD_MODE"],
    basePath: process.env["BASE_PATH"],
  });
  if (config.mode !== "legacy-full" && config.mode !== "legacy-migration") {
    throw new Error(
      `Legacy artifact generation requires a legacy build mode, received ${config.mode}`,
    );
  }
  const benchmarkCommit = process.env["BENCHMARK_COMMIT"];
  if (benchmarkCommit === undefined) throw new Error("BENCHMARK_COMMIT is required");
  const root = join(import.meta.dir, "..");
  const buildDirectory = join(root, "apps", "docs", "build");
  const routesJson = readFileSync(
    join(root, "apps", "docs", "deployment", "legacy-routes.json"),
    "utf8",
  );
  const identity = buildLegacyArtifactIdentity({
    sourceCommit:
      process.env["GITHUB_SHA"] ??
      Bun.spawnSync(["git", "rev-parse", "HEAD"], { stdout: "pipe" }).stdout.toString().trim(),
    benchmarkCommit,
    buildMode: config.mode,
    legacyRoutesJson: routesJson,
    benchmarkDirectory: join(buildDirectory, "bench"),
  });
  writeFileSync(join(buildDirectory, "artifact.json"), `${JSON.stringify(identity, null, 2)}\n`);
  console.log(`legacy artifact is bound to benchmark ${benchmarkCommit.slice(0, 12)}`);
}

if (import.meta.main) main();
