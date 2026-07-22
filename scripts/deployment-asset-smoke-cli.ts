import { smokeImmutableAssets } from "./deployment-asset-smoke.ts";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return value;
}

/** Collect `--paths /a /b /c` or repeated `--paths /a --paths /b`. */
function pathArguments(): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== "--paths") continue;
    let cursor = index + 1;
    if (cursor >= process.argv.length || process.argv[cursor]!.startsWith("--")) {
      throw new Error("Missing value for --paths");
    }
    while (cursor < process.argv.length && !process.argv[cursor]!.startsWith("--")) {
      values.push(process.argv[cursor]!);
      cursor += 1;
    }
  }
  return values;
}

async function main(): Promise<void> {
  const baseUrl = argument("--base-url");
  const expanded = pathArguments();
  if (expanded.length === 0) {
    throw new Error("Pass at least one path: --paths / /guide/getting-started");
  }

  const problems = await smokeImmutableAssets({ baseUrl, paths: expanded });
  const evidence = {
    schemaVersion: 1,
    baseUrl,
    paths: expanded,
    checkedAt: new Date().toISOString(),
    passed: problems.length === 0,
    problems,
  };
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.passed) process.exitCode = 1;
}

if (import.meta.main) await main();
