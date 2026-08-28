import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// This helper lives in scripts/release-wiring/, two levels below the repo root.
const root = resolve(import.meta.dir, "../..");

export const read = (path: string) => readFileSync(join(root, path), "utf8");

/** Orchestrator + reusable domain workflows (issue #392 multi-file CI). */
export const readCiSurface = () => {
  const dir = join(root, ".github/workflows");
  return readdirSync(dir)
    .filter((f) => f === "ci.yml" || (f.startsWith("ci-") && f.endsWith(".yml")))
    .toSorted()
    .map((f) => read(`.github/workflows/${f}`))
    .join("\n");
};

/** Prefer domain job body (has steps) over thin orchestrator `uses:` caller. */
export const ciJob = (ci: string, jobId: string): string => {
  const marker = `  ${jobId}:\n`;
  let start = -1;
  let from = 0;
  while (true) {
    const idx = ci.indexOf(marker, from);
    if (idx === -1) break;
    const window = ci.slice(idx, idx + 1200);
    if (window.includes("steps:")) {
      start = idx;
      break;
    }
    from = idx + marker.length;
  }
  if (start === -1) start = ci.indexOf(marker);
  if (start === -1) return "";
  const rest = ci.slice(start + 1);
  const next = rest.search(/\n  [a-z0-9_-]+:\n/);
  return next === -1 ? ci.slice(start) : ci.slice(start, start + 1 + next);
};

/** Suite path arguments of a `bun test …` invocation (flags and values dropped). */
export const suiteArgs = (command: string): string[] => {
  const start = command.indexOf("bun test");
  if (start === -1) return [];
  return command
    .slice(start + "bun test".length)
    .trim()
    .split(/\s+/)
    .filter((arg) => arg.length > 0 && !arg.startsWith("-"));
};

export const selfHostedGgsvelteCount = (workflow: string) =>
  workflow
    .split("\n")
    .filter(
      (line) =>
        line.trimStart().startsWith("runs-on:") &&
        line.includes("ggsvelte") &&
        !line.includes("ggsvelte-heavy"),
    ).length;

export const heavyRunsOnCount = (workflow: string) =>
  workflow
    .split("\n")
    .filter((line) => line.trimStart().startsWith("runs-on:") && line.includes("ggsvelte-heavy"))
    .length;
