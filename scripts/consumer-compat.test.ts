import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  commandExecutable,
  commandInvocation,
  commandPlan,
  fixtureManifest,
  packageTarballNames,
  resolveConsumerOptions,
} from "./consumer-compat.js";

describe("packed consumer compatibility harness", () => {
  test("installs every publishable tarball rather than workspace source", () => {
    expect(packageTarballNames("0.1.0")).toEqual([
      "ggsvelte-spec-0.1.0.tgz",
      "ggsvelte-core-0.1.0.tgz",
      "ggsvelte-0.1.0.tgz",
    ]);
  });

  test("uses executable package-manager shims without enabling a shell on Windows", () => {
    expect(commandExecutable("npm", "win32")).toBe("npm.cmd");
    expect(commandExecutable("pnpm", "win32")).toBe("pnpm.cmd");
    expect(commandExecutable("bun", "win32")).toBe("bun");
    expect(commandExecutable("npm", "linux")).toBe("npm");
  });

  test("reads matrix options from the environment without shell-specific expansion", () => {
    expect(
      resolveConsumerOptions([], {
        PACKAGE_MANAGER: "pnpm",
        PACKAGE_MANAGER_VERSION: "11.13.0",
        SVELTE_VERSION: "5.56.5",
      }),
    ).toEqual({
      packageManager: "pnpm",
      packageManagerVersion: "11.13.0",
      svelteVersion: "5.56.5",
    });
  });

  test("invokes the pinned pnpm CLI without relying on an installer-generated shim", () => {
    expect(commandInvocation("pnpm", ["--version"], "/repo", "linux")).toEqual({
      command: "node",
      args: [join("/repo", "node_modules", "pnpm", "bin", "pnpm.mjs"), "--version"],
    });
  });

  test.each(["npm", "pnpm", "bun"] as const)(
    "%s plan installs, checks, builds, renders, and exercises the CLI",
    (packageManager) => {
      const plan = commandPlan(packageManager);
      expect(plan[0]?.label).toBe("install packed consumer");
      expect(plan.map((step) => step.label)).toEqual([
        "install packed consumer",
        "type-check consumer",
        "build consumer",
        "runtime and SSR smoke",
        "CLI file input",
        "CLI stdin",
      ]);
    },
  );

  test("names every local tarball in the consumer manifest", () => {
    const manifest = fixtureManifest(
      "5.29.0",
      [
        join("artifacts", "ggsvelte-spec-0.0.0.tgz"),
        join("artifacts", "ggsvelte-core-0.0.0.tgz"),
        join("artifacts", "ggsvelte-0.0.0.tgz"),
      ],
      "/consumer",
    );
    expect(manifest.dependencies.svelte).toBe("5.29.0");
    expect(manifest.dependencies["@ggsvelte/spec"]).toContain("ggsvelte-spec-0.0.0.tgz");
    expect(manifest.dependencies["@ggsvelte/core"]).toContain("ggsvelte-core-0.0.0.tgz");
    expect(manifest.dependencies.ggsvelte).toContain("ggsvelte-0.0.0.tgz");
  });
});
