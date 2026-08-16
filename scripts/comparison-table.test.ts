/**
 * "Why ggsvelte?" capability tables (README + docs homepage).
 *
 * Column order is ggsvelte, then TanStack, then the original peer order.
 * TanStack cells are locked to the capability verdicts researched against
 * @tanstack/charts@0.14 (renderChartSvg + shipped skills; no JSON schema,
 * no CLI, no automatic time scale, not a ggplot2 API).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

const LIBS = ["ggsvelte", "TanStack", "SveltePlot", "Unovis", "LayerCake"] as const;

type Mark = "✅" | "⚠️" | "❌";

function parseReadmeTable(markdown: string): {
  headers: string[];
  rows: { feature: string; cells: { mark: Mark; note: string }[] }[];
} {
  const section = markdown.split("## Why ggsvelte?")[1];
  if (section === undefined) throw new Error("README.md is missing ## Why ggsvelte?");
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  const headerLine = lines[0];
  const body = lines.slice(2);
  if (headerLine === undefined || body.length === 0) {
    throw new Error("README.md comparison table is missing");
  }
  const headers = headerLine
    .split("|")
    .slice(1, -1)
    .map((col) => col.trim());
  const rows = body.map((line) => {
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((col) => col.trim());
    const feature = (cols[0] ?? "").replaceAll("*", "");
    const cells = cols.slice(1).map((raw) => {
      const mark = raw.startsWith("✅") ? "✅" : raw.startsWith("⚠️") ? "⚠️" : "❌";
      return { mark, note: raw.slice(mark.length).trim() };
    });
    return { feature, cells };
  });
  return { headers, rows };
}

function tableCell(
  table: ReturnType<typeof parseReadmeTable>,
  feature: string,
  lib: (typeof LIBS)[number],
): { mark: Mark; note: string } {
  const row = table.rows.find((r) => r.feature.startsWith(feature));
  if (row === undefined) throw new Error(`missing row ${feature}`);
  const index = table.headers.indexOf(lib);
  const found = row.cells[index - 1];
  if (found === undefined) throw new Error(`missing ${lib} cell for ${feature}`);
  return found;
}

describe("README Why ggsvelte? table", () => {
  const table = parseReadmeTable(readFileSync(join(ROOT, "README.md"), "utf8"));

  it("puts TanStack immediately after ggsvelte", () => {
    expect(table.headers).toEqual(["Capability", ...LIBS]);
  });

  it("records TanStack capability verdicts from the 0.14 research pass", () => {
    expect(tableCell(table, "Bundle size", "TanStack").mark).toBe("✅");
    expect(tableCell(table, "Bundle size", "TanStack").note).toMatch(/^\d+ KB$/);
    expect(tableCell(table, "API stability", "TanStack")).toEqual({
      mark: "⚠️",
      note: "v0.14",
    });
    expect(tableCell(table, "Headless server-side SVG", "TanStack").mark).toBe("✅");
    expect(tableCell(table, "Portable JSON spec + schema", "TanStack").mark).toBe("❌");
    expect(tableCell(table, "CLI validator + renderer", "TanStack").mark).toBe("❌");
    expect(tableCell(table, "Agent skill", "TanStack").mark).toBe("✅");
    expect(tableCell(table, "Automatic temporal detection", "TanStack").mark).toBe("❌");
    expect(tableCell(table, "Built-in interactions", "TanStack").mark).toBe("✅");
    expect(tableCell(table, "ggplot2 API", "TanStack").mark).toBe("❌");
    expect(tableCell(table, "Scale, axis & coord control", "TanStack").mark).toBe("✅");
  });
});

describe("docs homepage comparison table", () => {
  const source = readFileSync(join(ROOT, "apps/docs/src/lib/components/Benchmarks.svelte"), "utf8");

  it("renders TanStack as the column after ggsvelte", () => {
    expect(source).toMatch(
      /<th scope="col">ggsvelte<\/th>\s*<th scope="col">TanStack<\/th>\s*<th scope="col">SveltePlot<\/th>/,
    );
    expect(source).toMatch(/\[row\.gg, row\.ts, row\.sp, row\.uv, row\.lc\]/);
    expect(source).toMatch(/span="5"/);
  });

  it("uses the generated TanStack version and 1k-scatter bundle", () => {
    expect(source).toContain("BENCHMARK_VERSIONS.tanstack");
    expect(source).toContain("BENCHMARK_BUNDLE_KB.tanstackKb");
  });
});
