import { readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm" | "bun";

export interface ConsumerRow {
  os: "ubuntu-latest" | "windows-latest" | "macos-latest";
  node: string;
  packageManager: PackageManager;
  svelte: string;
}

export interface SupportMatrix {
  schemaVersion: 1;
  node: { range: string; tested: string[]; canary: string };
  svelte: { range: string; minimum: string; current: string };
  packageManagers: Record<PackageManager, string>;
  operatingSystems: ConsumerRow["os"][];
  browsers: { playwright: string; engines: string[] };
  required: ConsumerRow[];
  nightly: ConsumerRow[];
}

export function loadSupportMatrix(root = join(import.meta.dir, "..")): SupportMatrix {
  return JSON.parse(readFileSync(join(root, "support-matrix.json"), "utf8")) as SupportMatrix;
}

export function requiredConsumerRows(matrix: SupportMatrix): ConsumerRow[] {
  return matrix.required;
}

export function nightlyConsumerRows(matrix: SupportMatrix): ConsumerRow[] {
  return matrix.nightly;
}

export function validateSupportMatrix(matrix: SupportMatrix): string[] {
  const errors: string[] = [];
  if (matrix.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (matrix.node.range !== `>=${matrix.node.tested[0]}`) {
    errors.push("Node range must begin at the first required tested major");
  }
  if (matrix.svelte.range !== `^${matrix.svelte.minimum}`) {
    errors.push("Svelte peer range must begin at the tested minimum");
  }
  if (matrix.required.length < 4 || matrix.required.length > 6) {
    errors.push("required matrix must contain 4–6 covering rows");
  }
  if (matrix.required.length + matrix.nightly.length > 12) {
    errors.push("full nightly matrix must contain at most 12 rows");
  }
  const rows = [...matrix.required, ...matrix.nightly];
  const requiredValues = {
    node: new Set(matrix.required.map((row) => row.node)),
    svelte: new Set(matrix.required.map((row) => row.svelte)),
    packageManager: new Set(matrix.required.map((row) => row.packageManager)),
    os: new Set(matrix.required.map((row) => row.os)),
  };
  for (const node of matrix.node.tested) {
    if (!requiredValues.node.has(node)) errors.push(`required matrix must cover Node ${node}`);
  }
  for (const svelte of [matrix.svelte.minimum, matrix.svelte.current]) {
    if (!requiredValues.svelte.has(svelte)) {
      errors.push(`required matrix must cover Svelte ${svelte}`);
    }
  }
  for (const packageManager of Object.keys(matrix.packageManagers) as PackageManager[]) {
    if (!requiredValues.packageManager.has(packageManager)) {
      errors.push(`required matrix must cover ${packageManager}`);
    }
  }
  for (const os of ["ubuntu-latest", "windows-latest"] as const) {
    if (!requiredValues.os.has(os)) errors.push(`required matrix must cover ${os}`);
  }
  if (!matrix.nightly.some((row) => row.node === matrix.node.canary)) {
    errors.push(`nightly matrix must cover Node ${matrix.node.canary}`);
  }
  if (!matrix.nightly.some((row) => row.os === "macos-latest")) {
    errors.push("nightly matrix must cover macos-latest");
  }
  const keys = new Set<string>();
  for (const row of rows) {
    if (!matrix.operatingSystems.includes(row.os)) errors.push(`unknown OS: ${row.os}`);
    if (!(row.packageManager in matrix.packageManagers)) {
      errors.push(`unknown package manager: ${row.packageManager}`);
    }
    if (![...matrix.node.tested, matrix.node.canary].includes(row.node)) {
      errors.push(`unknown Node version: ${row.node}`);
    }
    if (![matrix.svelte.minimum, matrix.svelte.current].includes(row.svelte)) {
      errors.push(`unknown Svelte version: ${row.svelte}`);
    }
    const key = `${row.os}/${row.node}/${row.packageManager}/${row.svelte}`;
    if (keys.has(key)) errors.push(`duplicate row: ${key}`);
    keys.add(key);
  }
  if (matrix.browsers.engines.join(",") !== "chromium,firefox,webkit") {
    errors.push("browser matrix must contain Chromium, Firefox, and WebKit");
  }
  return errors;
}

if (import.meta.main) {
  const matrix = loadSupportMatrix();
  const errors = validateSupportMatrix(matrix);
  if (errors.length > 0) {
    for (const error of errors) console.error(`support-matrix: ${error}`);
    process.exit(1);
  }
  const flavor = process.argv[2];
  const withVersions = (rows: ConsumerRow[]) =>
    rows.map((row) => ({
      ...row,
      packageManagerVersion: matrix.packageManagers[row.packageManager],
    }));
  if (flavor === "required")
    console.log(JSON.stringify({ include: withVersions(matrix.required) }));
  else if (flavor === "nightly") {
    console.log(JSON.stringify({ include: withVersions([...matrix.required, ...matrix.nightly]) }));
  } else console.log("support-matrix: valid");
}
