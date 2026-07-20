import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { COMPLETE_SVELTE_SNIPPETS } from "./guide-code-contract.js";
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
  "@sveltejs/adapter-static@3.0.10",
  "@sveltejs/kit@2.20.8",
  "@sveltejs/vite-plugin-svelte@5.1.1",
  "@types/node@22.15.3",
  "svelte-check@4.7.3",
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

function scriptRunner(packageManager: PackageManager, script: string): CommandStep {
  return { label: "", command: packageManager, args: ["run", script] };
}

export function commandPlan(
  packageManager: PackageManager,
  expectedSveltePackageVersion: string,
): CommandStep[] {
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

  const typecheck = scriptRunner(packageManager, "check");
  typecheck.label = "sync and type-check SvelteKit consumer";
  const build = scriptRunner(packageManager, "build");
  build.label = "build and prerender SvelteKit consumer";
  const cliVersion = runner(packageManager, "ggsvelte-render", ["--version"]);
  cliVersion.label = "CLI version";
  cliVersion.expect = expectedSveltePackageVersion;
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
    build,
    {
      label: "verify prerendered Quickstart",
      command: "node",
      args: ["verify-prerender.mjs"],
      expect: "prerendered Quickstart verified",
    },
    {
      label: "runtime and SSR smoke",
      command: "node",
      args: ["smoke.mjs"],
      expect: "consumer smoke passed",
    },
    cliVersion,
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
    scripts: {
      check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --fail-on-warnings",
      build: "vite build",
    },
    ...(packageManager === "bun" ? { overrides: localPackages } : {}),
  };
}

export function writeConsumerFixture(
  directory: string,
  svelteVersion: string,
  tarballs: string[],
  packageManager: PackageManager,
): void {
  mkdirSync(join(directory, "src", "lib"), { recursive: true });
  mkdirSync(join(directory, "src", "routes", "contract"), { recursive: true });
  const manifest = fixtureManifest(svelteVersion, tarballs, directory, packageManager);
  writeFileSync(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (packageManager === "pnpm") {
    writeFileSync(
      join(directory, "pnpm-workspace.yaml"),
      `packages: []\noverrides:\n  '@ggsvelte/spec': ${JSON.stringify(manifest.dependencies["@ggsvelte/spec"])}\n  '@ggsvelte/core': ${JSON.stringify(manifest.dependencies["@ggsvelte/core"])}\n  '@ggsvelte/svelte': ${JSON.stringify(manifest.dependencies["@ggsvelte/svelte"])}\n`,
    );
  }
  writeFileSync(
    join(directory, "tsconfig.json"),
    `${JSON.stringify(
      {
        extends: "./.svelte-kit/tsconfig.json",
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          lib: ["ES2024", "DOM", "DOM.Iterable"],
          moduleResolution: "Bundler",
          resolveJsonModule: true,
          skipLibCheck: false,
          sourceMap: true,
          strict: true,
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(directory, "svelte.config.js"),
    `import adapter from "@sveltejs/adapter-static";\n\nexport default { kit: { adapter: adapter() } };\n`,
  );
  writeFileSync(
    join(directory, "vite.config.ts"),
    `import { sveltekit } from "@sveltejs/kit/vite";\nimport { defineConfig } from "vite";\n\nexport default defineConfig({ plugins: [sveltekit()] });\n`,
  );
  writeFileSync(
    join(directory, "src", "app.html"),
    `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    %sveltekit.head%\n  </head>\n  <body data-sveltekit-preload-data="hover">\n    <div style="display: contents">%sveltekit.body%</div>\n  </body>\n</html>\n`,
  );
  writeFileSync(join(directory, "src", "routes", "+layout.ts"), `export const prerender = true;\n`);
  for (const snippet of COMPLETE_SVELTE_SNIPPETS) {
    const target = join(directory, snippet.filename);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${snippet.source}\n`);
  }
  writeFileSync(
    join(directory, "src", "routes", "contract", "+page.svelte"),
    `<script lang="ts">
  import { dmy, GGPlot, GeomLine, scaleXDate, scale_x_date, type GuidePlan, type PortableSpec } from "@ggsvelte/svelte";
  const spec: PortableSpec = ${JSON.stringify(plotSpec)};
  const temporalRows = [
    { year: "1835", value: 12 },
    { year: "1900", value: 19 },
    { year: "2026", value: 31 },
  ];
  const explicitDateScale = scale_x_date({ parse: "dmy" });
  const camelDateScale = scaleXDate({
    parse: "iso",
    dateBreaks: "2 weeks",
    dateMinorBreaks: "1 day",
    dateLabels: "%e %b",
    locale: "en-GB",
    weekStart: "monday",
  });
  const authorDate = dmy("31/12/2024");
  void explicitDateScale;
  void camelDateScale;
  const guidePlan: GuidePlan | undefined = undefined;
  void authorDate;
  void guidePlan;
</script>

<GGPlot {spec} width={480} height={320} inspect={true} ariaLabel="Packed contract chart" />
<GGPlot
  data={temporalRows}
  aes={{ x: "year", y: "value" }}
  width={480}
  height={320}
  ariaLabel="Raw year temporal contract chart"
>
  <GeomLine />
</GGPlot>
`,
  );
  writeFileSync(join(directory, "plot.json"), `${JSON.stringify(plotSpec)}\n`);
  writeFileSync(
    join(directory, "verify-prerender.mjs"),
    `import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("build/index.html", "utf8");
assert.match(html, /<title>My first ggsvelte chart<\\/title>/);
assert.match(html, /aria-label="Fuel economy decreases as vehicle weight increases"/);
assert.match(html, /class="gg-plot-root[^"]*gg-container-width"/);
assert.match(html, /data-gg-ready="false"/);
assert.match(html, /width="640" height="400"/);
assert.match(html, /_app\\/immutable/);
assert.equal(
  existsSync("build/contract.html") || existsSync("build/contract/index.html"),
  true,
);
console.log("prerendered Quickstart verified");
`,
  );
  writeFileSync(
    join(directory, "smoke.mjs"),
    `import { strict as assert } from "node:assert";
import { SpecModule, validate } from "@ggsvelte/spec";
import { renderToSVGString } from "@ggsvelte/core";

const pointParamsSchema = SpecModule.Import("PointParams");
void pointParamsSchema;
const spec = ${JSON.stringify(plotSpec)};
const temporalSpec = {
  data: { values: [{ year: "1835", value: 12 }, { year: "2026", value: 31 }] },
  layers: [{ geom: "line", aes: { x: { field: "year" }, y: { field: "value" } } }],
  scales: { x: { type: "time", dateBreaks: "50 years", dateLabels: "%Y", locale: "en-GB" } },
};
assert.equal(validate(spec).ok, true);
assert.equal(validate(temporalSpec).ok, true);
assert.match(renderToSVGString(spec, { width: 480, height: 320 }), /<svg/);
assert.match(renderToSVGString(temporalSpec, { width: 480, height: 320 }), /1835|1850/);
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
    writeConsumerFixture(fixture, svelteVersion, tarballs, packageManager);
    verifyPackageManagerVersion(packageManager, packageManagerVersion, fixture, root);
    const expectedSveltePackageVersion = packageVersion(root, "svelte");
    for (const step of commandPlan(packageManager, expectedSveltePackageVersion)) {
      run(step, fixture, root);
    }
    console.log(`consumer-compat: PASS (${packageManager}, Svelte ${svelteVersion})`);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (import.meta.main) main();
