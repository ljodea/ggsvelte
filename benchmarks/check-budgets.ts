/**
 * Budget gate (M3): compares bench-results.json (repo root, written by
 * `bun run bench:json`) against the committed budgets.json. Prints a table
 * (workload, measured, budget, headroom %) and exits 1 if any workload
 * exceeds its budget.
 *
 * The two files must cover the SAME workload set — asserted in BOTH
 * directions so a new workload cannot dodge budgeting and a stale budget
 * entry cannot linger after a workload is removed.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface BenchResult {
  name: string;
  unit: string;
  value: number;
}

interface BudgetsFile {
  budgets: Record<string, { budgetMs: number }>;
}

function fail(message: string): never {
  console.error(`check-budgets: ${message}`);
  process.exit(1);
}

function readJson(url: URL, what: string): unknown {
  const path = fileURLToPath(url);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return fail(
      `missing ${what} at ${path}${what === "bench-results.json" ? " — run `bun run bench:json` first" : ""}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fail(`${what} at ${path} is not valid JSON`);
  }
}

// --- load + validate shapes --------------------------------------------------

const resultsJson = readJson(
  new URL("../bench-results.json", import.meta.url),
  "bench-results.json",
);
if (!Array.isArray(resultsJson) || resultsJson.length === 0) {
  fail("bench-results.json must be a non-empty JSON array");
}
const results = resultsJson as BenchResult[];
for (const r of results) {
  if (typeof r.name !== "string" || typeof r.value !== "number" || !Number.isFinite(r.value)) {
    fail(`malformed result entry: ${JSON.stringify(r)}`);
  }
}

const budgetsJson = readJson(new URL("./budgets.json", import.meta.url), "budgets.json");
const budgetsFile = budgetsJson as BudgetsFile;
if (typeof budgetsFile.budgets !== "object" || budgetsFile.budgets === null) {
  fail('budgets.json must have a "budgets" object');
}
const budgets = budgetsFile.budgets;
for (const [name, entry] of Object.entries(budgets)) {
  if (
    typeof entry.budgetMs !== "number" ||
    !Number.isFinite(entry.budgetMs) ||
    entry.budgetMs <= 0
  ) {
    fail(`malformed budget entry for "${name}": ${JSON.stringify(entry)}`);
  }
}

// --- both directions: results <-> budgets must cover the same set -----------

const resultNames = new Set(results.map((r) => r.name));
if (resultNames.size !== results.length) fail("duplicate workload names in bench-results.json");

const missingBudgets = results.filter((r) => !(r.name in budgets)).map((r) => r.name);
if (missingBudgets.length > 0) {
  fail(
    `workloads without a budget (add them to benchmarks/budgets.json): ${missingBudgets.join(", ")}`,
  );
}
const staleBudgets = Object.keys(budgets).filter((name) => !resultNames.has(name));
if (staleBudgets.length > 0) {
  fail(
    `budget entries with no result (stale? remove or re-run bench:json): ${staleBudgets.join(", ")}`,
  );
}

// --- table + verdict ---------------------------------------------------------

const nameWidth = Math.max(...results.map((r) => r.name.length), "workload".length);
const rows: string[] = [];
let failures = 0;
for (const r of results) {
  const budgetMs = budgets[r.name]!.budgetMs;
  const over = r.value > budgetMs;
  if (over) failures++;
  // Headroom: how far under budget the measurement sits (negative = over).
  const headroomPct = ((budgetMs - r.value) / budgetMs) * 100;
  rows.push(
    [
      r.name.padEnd(nameWidth),
      `${r.value.toFixed(3).padStart(10)} ms`,
      `${budgetMs.toFixed(3).padStart(10)} ms`,
      `${headroomPct.toFixed(1).padStart(7)} %`,
      over ? "OVER BUDGET" : "ok",
    ].join("  "),
  );
}

console.log(
  [
    "workload".padEnd(nameWidth),
    "measured".padStart(13),
    "budget".padStart(13),
    "headroom".padStart(9),
    "",
  ].join("  "),
);
for (const row of rows) console.log(row);

if (failures > 0) {
  console.error(`\ncheck-budgets: ${failures} workload(s) over budget`);
  process.exit(1);
}
console.log(`\ncheck-budgets: all ${results.length} workloads within budget`);
