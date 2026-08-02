/**
 * Pin gallery blurbs that must match the chart the example actually draws.
 * Regression guard for post-merge review findings on #1376 (wrong group
 * counts / layout words that survive in meta.json → manifest → docs).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

function readMeta(id: string): { title: string; description: string } {
  return JSON.parse(readFileSync(join(root, "examples", id, "meta.json"), "utf8")) as {
    title: string;
    description: string;
  };
}

describe("example gallery blurbs match the drawn chart", () => {
  test("errorbar/mean-se describes four treatment groups, not two", () => {
    const meta = readMeta("errorbar/mean-se");
    // Spec domain is Control + three hypnotics (Student's sleep data).
    expect(meta.description).toBe("Mean ± SE for a control and three hypnotic treatments.");
    expect(meta.description.toLowerCase()).not.toContain("two-group");
  });

  test("bar/proportions describes fill-stacked shares, not dodged bars", () => {
    const meta = readMeta("bar/proportions");
    // Example uses geomBar({ position: "fill" }) only — no dodge.
    expect(meta.description).toBe(
      "Bars stacked to a full height so each segment reads as a share of its group.",
    );
    expect(meta.description.toLowerCase()).not.toContain("dodge");
  });
});
