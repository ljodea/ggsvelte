import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { loadSupportMatrix, type PackageManager } from "./support-matrix.js";

interface CommandStep {
  label: string;
  command: string;
  args: string[];
  input?: string;
  expect?: string;
}

const fixtureDependencies = [
  // The compatibility fixture must itself support the Svelte 5.33.1 floor.
  // Plugin 7 requires Svelte 5.46+, which would make the minimum row a test
  // of fixture peer resolution rather than a test of ggsvelte.
  "@sveltejs/vite-plugin-svelte@5.1.1",
  "svelte-check@4.7.2",
  "typescript@6.0.3",
  "vite@6.4.3",
];

const publishablePackageDirectories = ["spec", "core", "svelte"] as const;

type PublishablePackageVersions = Readonly<
  Record<(typeof publishablePackageDirectories)[number], string>
>;

export function packageTarballNames(versions: PublishablePackageVersions): string[] {
  return publishablePackageDirectories.map(
    (packageDirectory) => `ggsvelte-${packageDirectory}-${versions[packageDirectory]}.tgz`,
  );
}

export function commandExecutable(command: string, platform = process.platform): string {
  if (platform === "win32" && (command === "npm" || command === "pnpm")) {
    return `${command}.cmd`;
  }
  return command;
}

export function resolveConsumerOptions(
  args: string[],
  environment: Record<string, string | undefined>,
) {
  return {
    packageManager: (args[0] ?? environment.PACKAGE_MANAGER ?? "npm") as PackageManager,
    // Single-sourced from support-matrix.json — the floor lives in one place.
    svelteVersion: args[1] ?? environment.SVELTE_VERSION ?? loadSupportMatrix().svelte.minimum,
    packageManagerVersion: args[2] ?? environment.PACKAGE_MANAGER_VERSION,
  };
}

export function commandInvocation(
  command: string,
  args: string[],
  root: string,
  platform = process.platform,
): { command: string; args: string[] } {
  if (command === "pnpm") {
    return {
      command: "node",
      args: [join(root, "node_modules", "pnpm", "bin", "pnpm.mjs"), ...args],
    };
  }
  return { command: commandExecutable(command, platform), args };
}

export function packagePackInvocation(
  artifacts: string,
  platform = process.platform,
): { command: string; args: string[] } {
  return {
    command: commandExecutable("npm", platform),
    args: ["pack", ".", "--pack-destination", artifacts, "--ignore-scripts", "--silent"],
  };
}

function runner(packageManager: PackageManager, binary: string, args: string[]): CommandStep {
  if (packageManager === "npm") {
    return { label: "", command: "npm", args: ["exec", "--", binary, ...args] };
  }
  if (packageManager === "pnpm") {
    return { label: "", command: "pnpm", args: ["exec", binary, ...args] };
  }
  return { label: "", command: "bun", args: ["run", binary, ...args] };
}

export function commandPlan(packageManager: PackageManager): CommandStep[] {
  const install: CommandStep =
    packageManager === "npm"
      ? {
          label: "install packed consumer",
          command: "npm",
          args: ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
        }
      : packageManager === "pnpm"
        ? {
            label: "install packed consumer",
            command: "pnpm",
            args: ["install", "--ignore-scripts"],
          }
        : {
            label: "install packed consumer",
            command: "bun",
            args: ["install", "--ignore-scripts"],
          };

  const typecheck = runner(packageManager, "svelte-check", [
    "--tsconfig",
    "./tsconfig.json",
    "--fail-on-warnings",
  ]);
  typecheck.label = "type-check consumer";
  const cliFile = runner(packageManager, "ggsvelte-render", ["plot.json"]);
  cliFile.label = "CLI file input";
  cliFile.expect = "<svg";
  const cliStdin = runner(packageManager, "ggsvelte-render", []);
  cliStdin.label = "CLI stdin";
  cliStdin.input = `${JSON.stringify(plotSpec)}\n`;
  cliStdin.expect = "<svg";

  return [
    install,
    typecheck,
    { label: "build consumer", command: "node", args: ["build.mjs"] },
    {
      label: "runtime and SSR smoke",
      command: "node",
      args: ["smoke.mjs"],
      expect: "consumer smoke passed",
    },
    cliFile,
    cliStdin,
  ];
}

const plotSpec = {
  data: {
    values: [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ],
  },
  layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
};

export function fixtureManifest(
  svelteVersion: string,
  tarballs: string[],
  directory: string,
  packageManager: PackageManager = "npm",
) {
  const file = (path: string) => `file:${relative(directory, path).replaceAll("\\", "/")}`;
  const localPackages = {
    "@ggsvelte/spec": file(tarballs[0]!),
    "@ggsvelte/core": file(tarballs[1]!),
    "@ggsvelte/svelte": file(tarballs[2]!),
  };
  return {
    name: "ggsvelte-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      ...localPackages,
      svelte: svelteVersion,
    },
    devDependencies: Object.fromEntries(
      fixtureDependencies.map((entry) => {
        const separator = entry.lastIndexOf("@");
        return [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
    ),
    ...(packageManager === "bun" ? { overrides: localPackages } : {}),
  };
}

function writeFixture(
  directory: string,
  svelteVersion: string,
  tarballs: string[],
  packageManager: PackageManager,
): void {
  mkdirSync(join(directory, "src"), { recursive: true });
  const manifest = fixtureManifest(svelteVersion, tarballs, directory, packageManager);
  writeFileSync(join(directory, "package.json"), JSON.stringify(manifest, null, 2));
  if (packageManager === "pnpm") {
    writeFileSync(
      join(directory, "pnpm-workspace.yaml"),
      `packages: []\noverrides:\n  '@ggsvelte/spec': ${JSON.stringify(manifest.dependencies["@ggsvelte/spec"])}\n  '@ggsvelte/core': ${JSON.stringify(manifest.dependencies["@ggsvelte/core"])}\n  '@ggsvelte/svelte': ${JSON.stringify(manifest.dependencies["@ggsvelte/svelte"])}\n`,
    );
  }
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ES2023",
          strict: true,
          skipLibCheck: false,
          types: ["svelte"],
        },
        include: ["src/**/*.ts", "src/**/*.svelte"],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(directory, "index.html"),
    '<div id="app"></div><script type="module" src="/src/main.ts"></script>',
  );
  writeFileSync(
    join(directory, "src", "App.svelte"),
    `<script lang="ts">
  import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";
  const spec: PortableSpec = ${JSON.stringify(plotSpec)};
</script>
<GGPlot {spec} width={480} height={320} inspect={true} />
`,
  );
  writeFileSync(
    join(directory, "src", "main.ts"),
    'import { mount } from "svelte";\nimport App from "./App.svelte";\nmount(App, { target: document.querySelector("#app")! });\n',
  );
  writeFileSync(
    join(directory, "build.mjs"),
    `import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
await build({ configFile: false, plugins: [svelte()], build: { outDir: "dist-client" } });
await build({
  configFile: false,
  plugins: [svelte()],
  build: { ssr: "src/ssr.ts", outDir: "dist-ssr" },
  ssr: { noExternal: ["@ggsvelte/svelte"] },
});
`,
  );
  writeFileSync(
    join(directory, "src", "ssr.ts"),
    `import { render } from "svelte/server";
import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";
const spec: PortableSpec = ${JSON.stringify(plotSpec)};
export const html = render(GGPlot, { props: { spec, width: 480, height: 320 } }).body;
`,
  );
  writeFileSync(join(directory, "plot.json"), `${JSON.stringify(plotSpec)}\n`);
  writeFileSync(
    join(directory, "smoke.mjs"),
    `import { strict as assert } from "node:assert";
import { validate } from "@ggsvelte/spec";
import { renderToSVGString } from "@ggsvelte/core";
import { html } from "./dist-ssr/ssr.js";
const spec = ${JSON.stringify(plotSpec)};
assert.equal(validate(spec).ok, true);
assert.match(renderToSVGString(spec, { width: 480, height: 320 }), /<svg/);
assert.match(html, /gg-plot/);
console.log("consumer smoke passed");
`,
  );
}

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
    writeFixture(fixture, svelteVersion, tarballs, packageManager);
    verifyPackageManagerVersion(packageManager, packageManagerVersion, fixture, root);
    for (const step of commandPlan(packageManager)) run(step, fixture, root);
    console.log(`consumer-compat: PASS (${packageManager}, Svelte ${svelteVersion})`);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (import.meta.main) main();
