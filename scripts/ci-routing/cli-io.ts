/**
 * Shared CLI I/O helpers for ci-routing command modules.
 * GITHUB_OUTPUT writes go through writeGithubOutput so call sites stay consistent.
 */
import { appendFileSync } from "node:fs";

/** Append a body to $GITHUB_OUTPUT when set; no-op otherwise. */
export function writeGithubOutput(body: string): void {
  const outPath = process.env["GITHUB_OUTPUT"];
  if (typeof outPath === "string" && outPath.length > 0) {
    appendFileSync(outPath, body);
  }
}

export function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0) return undefined;
  return args[i + 1];
}
