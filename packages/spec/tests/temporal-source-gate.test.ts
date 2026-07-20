import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (path.endsWith(".ts")) out.push(path);
  }
  return out;
}

describe("temporal source gate", () => {
  it("keeps Date.parse out of shared spec/core success paths", () => {
    const roots = [
      join(import.meta.dir, "..", "src"),
      join(import.meta.dir, "..", "..", "core", "src"),
    ];
    const offenders = roots
      .flatMap((directory) => sourceFiles(directory))
      .filter((path) => readFileSync(path, "utf8").includes("Date.parse"));
    expect(offenders).toEqual([]);
  });
});
