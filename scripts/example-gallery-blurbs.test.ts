/**
 * Pin gallery blurbs that must match the chart the example actually draws.
 * Regression guard for post-merge review findings on #1376 (wrong group
 * counts / layout words that survive in meta.json → manifest → docs).
 *
 * Also bans the "The same …" cross-reference formula in user-facing gallery
 * copy: titles and descriptions must stand alone when a reader lands from
 * search or a gallery card (#1572 follow-up).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

const root = join(import.meta.dir, "..");
const examplesRoot = join(root, "examples");

/** Sibling-cross-ref slop: "The same columns…", "The same deaths as…". */
const THE_SAME_FORMULA = /\bThe same\b/;

function readMeta(id: string): { title: string; description: string } {
  return JSON.parse(readFileSync(join(root, "examples", id, "meta.json"), "utf8")) as {
    title: string;
    description: string;
  };
}

function existsMeta(dir: string): boolean {
  try {
    return statSync(join(dir, "meta.json")).isFile();
  } catch {
    return false;
  }
}

function walkExampleIds(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const id = prefix === "" ? entry : `${prefix}/${entry}`;
    if (existsMeta(full)) {
      out.push(id);
    } else {
      out.push(...walkExampleIds(full, id));
    }
  }
  return out;
}

/** Labs title= / title: string literals in Example.svelte and spec.ts. */
function chartTitles(id: string): string[] {
  const titles: string[] = [];
  for (const file of ["Example.svelte", "spec.ts"] as const) {
    let source: string;
    try {
      source = readFileSync(join(examplesRoot, id, file), "utf8");
    } catch {
      continue;
    }
    for (const match of source.matchAll(/\btitle\s*[:=]\s*"([^"]+)"/g)) {
      const t = match[1];
      if (t !== undefined) titles.push(t);
    }
    for (const match of source.matchAll(/\btitle\s*[:=]\s*'([^']+)'/g)) {
      const t = match[1];
      if (t !== undefined) titles.push(t);
    }
  }
  return titles;
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

  test('no gallery copy uses the "The same …" cross-reference formula', () => {
    const offenders: string[] = [];
    for (const id of walkExampleIds(examplesRoot)) {
      const meta = readMeta(id);
      if (THE_SAME_FORMULA.test(meta.title)) {
        offenders.push(`${id} meta.title: ${meta.title}`);
      }
      if (THE_SAME_FORMULA.test(meta.description)) {
        offenders.push(`${id} meta.description: ${meta.description}`);
      }
      for (const title of chartTitles(id)) {
        if (THE_SAME_FORMULA.test(title)) {
          offenders.push(`${id} chart title: ${title}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
