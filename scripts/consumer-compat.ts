/**
 * Packed consumer compatibility harness — pack publishable packages, write a
 * clean SvelteKit fixture, install, check, and build.
 *
 * Pure planning: consumer-compat-plan.ts. Fixtures: consumer-compat-fixture.ts.
 */
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  commandInvocation,
  commandPlan,
  packagePackInvocation,
  packageTarballNames,
  publishablePackageDirectories,
  resolveConsumerOptions,
  type CommandStep,
  type PublishablePackageVersions,
} from "./consumer-compat-plan.js";
import { writeConsumerFixture } from "./consumer-compat-fixture.js";
import { type PackageManager } from "./support-matrix.js";

export {
  commandExecutable,
  commandInvocation,
  commandPlan,
  packagePackInvocation,
  packageTarballNames,
  resolveConsumerOptions,
  type CommandStep,
} from "./consumer-compat-plan.js";
export { fixtureManifest, writeConsumerFixture } from "./consumer-compat-fixture.js";

function run(step: CommandStep, cwd: string, root: string): void {
  console.log(`consumer-compat: ${step.label}`);
  const invocation = commandInvocation(step.command, step.args, root);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    input: step.input,
    stdio: step.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    shell: false,
  });
  if (result.stdout && step.expect === undefined) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0)
    throw new Error(`${step.label} failed with exit ${String(result.status)}`);
  if (step.expect !== undefined && !result.stdout.includes(step.expect)) {
    throw new Error(`${step.label} output did not include ${JSON.stringify(step.expect)}`);
  }
  if (step.expect !== undefined) console.log(`consumer-compat: ${step.label} output verified`);
}

function verifyPackageManagerVersion(
  packageManager: PackageManager,
  expectedVersion: string | undefined,
  cwd: string,
  root: string,
): void {
  const invocation = commandInvocation(packageManager, ["--version"], root);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${packageManager} version check failed with exit ${String(result.status)}`);
  }
  const actualVersion = result.stdout.trim();
  if (
    expectedVersion !== undefined &&
    expectedVersion !== "bundled with Node" &&
    actualVersion !== expectedVersion
  ) {
    throw new Error(`${packageManager} version ${actualVersion} did not match ${expectedVersion}`);
  }
  console.log(`consumer-compat: ${packageManager} ${actualVersion}`);
}

function packageVersion(root: string, packageDirectory: string): string {
  const manifest = JSON.parse(
    readFileSync(join(root, "packages", packageDirectory, "package.json"), "utf8"),
  ) as { version: string };
  return manifest.version;
}

function pack(root: string, artifacts: string): string[] {
  const versions: PublishablePackageVersions = {
    spec: packageVersion(root, "spec"),
    core: packageVersion(root, "core"),
    svelte: packageVersion(root, "svelte"),
    cli: packageVersion(root, "cli"),
  };
  for (const packageDirectory of publishablePackageDirectories) {
    const invocation = packagePackInvocation(artifacts);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: join(root, "packages", packageDirectory),
      stdio: "inherit",
      shell: false,
    });
    if (result.status !== 0) throw new Error(`packing packages/${packageDirectory} failed`);
  }
  const tarballs = packageTarballNames(versions).map((name) => join(artifacts, name));
  for (const tarball of tarballs) {
    if (!existsSync(tarball)) throw new Error(`expected packed artifact ${basename(tarball)}`);
  }
  return tarballs;
}

function main(): void {
  const { packageManager, svelteVersion, packageManagerVersion } = resolveConsumerOptions(
    process.argv.slice(2),
    process.env,
  );
  if (!["npm", "pnpm", "bun"].includes(packageManager)) {
    throw new Error(`unknown package manager: ${packageManager}`);
  }
  const root = resolve(import.meta.dir, "..");
  const temporaryRoot = mkdtempSync(join(tmpdir(), "ggsvelte-compat-"));
  const artifacts = join(temporaryRoot, "packed artifacts");
  const fixture = join(temporaryRoot, "consumer space ü");
  mkdirSync(artifacts, { recursive: true });
  mkdirSync(fixture, { recursive: true });
  try {
    const tarballs = pack(root, artifacts);
    writeConsumerFixture(fixture, svelteVersion, tarballs, packageManager);
    verifyPackageManagerVersion(packageManager, packageManagerVersion, fixture, root);
    const expectedCliPackageVersion = packageVersion(root, "cli");
    for (const step of commandPlan(packageManager, expectedCliPackageVersion)) {
      run(step, fixture, root);
    }
    console.log(`consumer-compat: PASS (${packageManager}, Svelte ${svelteVersion})`);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (import.meta.main) main();
