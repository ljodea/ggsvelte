import {
  cutoverSmokePlan,
  evaluateSmokeResponse,
  previewSmokePlan,
  type SmokeExpectation,
} from "./deployment-smoke.ts";

interface SmokeResult {
  readonly name: string;
  readonly url: string;
  readonly status: number | null;
  readonly durationMs: number;
  readonly problems: readonly string[];
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing required deployment smoke argument: ${name}`);
  }
  return value;
}

async function observe(expected: SmokeExpectation): Promise<SmokeResult> {
  const started = performance.now();
  try {
    const response = await fetch(expected.url, {
      redirect: "manual",
      cache: "no-store",
      headers: { "cache-control": "no-cache", "user-agent": "ggsvelte-deployment-smoke/1" },
      signal: AbortSignal.timeout(15_000),
    });
    const actual = {
      status: response.status,
      headers: response.headers,
      body: await response.text(),
    };
    return {
      name: expected.name,
      url: expected.url,
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      problems: evaluateSmokeResponse(expected, actual),
    };
  } catch (error) {
    return {
      name: expected.name,
      url: expected.url,
      status: null,
      durationMs: Math.round(performance.now() - started),
      problems: [
        `${expected.name}: request failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

async function runBounded(plan: readonly SmokeExpectation[]): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  for (let index = 0; index < plan.length; index += 4) {
    results.push(
      ...(await Promise.all(
        plan.slice(index, index + 4).map((expectation) => observe(expectation)),
      )),
    );
  }
  return results;
}

async function main(): Promise<void> {
  const phase = argument("--phase");
  const sourceCommit = argument("--source-commit");
  const plan =
    phase === "preview"
      ? previewSmokePlan(argument("--base-url"), sourceCommit)
      : phase === "cutover"
        ? cutoverSmokePlan({
            apexOrigin: argument("--apex-origin"),
            wwwOrigin: argument("--www-origin"),
            productionPagesOrigin: argument("--production-pages-origin"),
            legacyOrigin: argument("--legacy-origin"),
            sourceCommit,
          })
        : (() => {
            throw new Error(`Unknown deployment smoke phase: ${phase}`);
          })();
  const results = await runBounded(plan);
  const evidence = {
    schemaVersion: 1,
    phase,
    sourceCommit,
    checkedAt: new Date().toISOString(),
    passed: results.every(({ problems }) => problems.length === 0),
    results,
  };
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.passed) process.exitCode = 1;
}

if (import.meta.main) await main();
