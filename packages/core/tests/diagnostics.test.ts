/**
 * Diagnostics-catalog completeness (M3 error-catalog audit): the catalogs under
 * src/diagnostics.ts (+ diagnostics-*-catalog.ts modules) must cover every code
 * the core sources can emit, and carry no dead entries. Enforced by scanning
 * emission sites — adding a new `new PipelineError("x", ...)` or
 * `warnings.push({ code: "x", ... })` without a catalog entry fails this test,
 * and so does cataloging a code nothing emits.
 *
 * Catalog modules themselves are excluded from the dead-entry corpus (their
 * keys would otherwise always "appear"). Dynamic style emissions rewrite
 * ScaleWarningCode as `style-${code}` in scale-style-discrete.ts.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import {
  ADVISORY_CATALOG,
  CLI_DIAGNOSTIC_CATALOG,
  PIPELINE_ERROR_CATALOG,
  PIPELINE_WARNING_CATALOG,
} from "../src/diagnostics.ts";

const SRC = join(import.meta.dir, "..", "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (entry.name.endsWith(".ts")) out.push(path);
  }
  return out;
}

/** Pure catalog tables — not emission sites. */
function isCatalogSource(path: string): boolean {
  const name = basename(path);
  return (
    name === "diagnostics.ts" ||
    name === "diagnostics-error-catalog.ts" ||
    name === "diagnostics-warning-catalog.ts"
  );
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const emissionFiles = files.filter((f) => !isCatalogSource(f.path));
const emissionText = emissionFiles.map((f) => f.text).join("\n");

/** Codes thrown as PipelineError / ScaleConfigError (constructor literals). */
function emittedErrorCodes(): Set<string> {
  const codes = new Set<string>();
  for (const { text } of emissionFiles) {
    for (const m of text.matchAll(
      /new (?:PipelineError|ScaleConfigError)\(\s*\n?\s*"([a-z0-9-]+)"/g,
    )) {
      codes.add(m[1]!);
    }
  }
  return codes;
}

/** `code: "..."` literals in warnings.push / advisories.push / errLine sites. */
function emittedCodeLiterals(): Set<string> {
  const codes = new Set<string>();
  for (const { text } of emissionFiles) {
    for (const m of text.matchAll(/code: "([a-z0-9-]+)"/g)) codes.add(m[1]!);
  }
  return codes;
}

/** ScaleWarningCode union members (state.ts) surface via scale.warnings. */
function scaleWarningCodes(): Set<string> {
  const state = readFileSync(join(SRC, "scales", "state.ts"), "utf8");
  const union = /export type ScaleWarningCode =([^;]+);/.exec(state)?.[1] ?? "";
  return new Set([...union.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]!));
}

/**
 * Discrete style training rewrites ScaleWarningCode as `style-${code}`
 * (see pipeline/scale-style-discrete.ts). Those full codes never appear as
 * quoted literals at the emit site.
 */
function stylePrefixedScaleWarningCodes(): Set<string> {
  const hasStyleTemplate = emissionFiles.some((f) => /code:\s*`style-\$\{/.test(f.text));
  if (!hasStyleTemplate) return new Set();
  return new Set([...scaleWarningCodes()].map((c) => `style-${c}`));
}

function isEmittedOutsideCatalog(code: string): boolean {
  if (emissionText.includes(`"${code}"`)) return true;
  if (stylePrefixedScaleWarningCodes().has(code)) return true;
  return false;
}

const errorCatalog = new Set(Object.keys(PIPELINE_ERROR_CATALOG));
const warningCatalog = new Set(Object.keys(PIPELINE_WARNING_CATALOG));
const advisoryCatalog = new Set(Object.keys(ADVISORY_CATALOG));
const cliCatalog = new Set(Object.keys(CLI_DIAGNOSTIC_CATALOG));

describe("diagnostics catalog completeness", () => {
  it("every thrown PipelineError/ScaleConfigError code is cataloged", () => {
    const missing = [...emittedErrorCodes()].filter((c) => !errorCatalog.has(c));
    expect(missing).toEqual([]);
  });

  it("every `code:` literal is cataloged somewhere (warning/advisory/error/cli)", () => {
    const known = new Set([...errorCatalog, ...warningCatalog, ...advisoryCatalog, ...cliCatalog]);
    const missing = [...emittedCodeLiterals()].filter((c) => !known.has(c));
    expect(missing).toEqual([]);
  });

  it("every ScaleWarningCode is in the warning catalog", () => {
    const missing = [...scaleWarningCodes()].filter((c) => !warningCatalog.has(c));
    expect(missing).toEqual([]);
  });

  it("style-prefixed ScaleWarningCode emissions are cataloged as warnings", () => {
    const missing = [...stylePrefixedScaleWarningCodes()].filter((c) => !warningCatalog.has(c));
    expect(missing).toEqual([]);
  });

  it("no dead catalog entries: every cataloged code is emitted outside catalogs", () => {
    const dead: string[] = [];
    for (const code of [...errorCatalog, ...warningCatalog, ...advisoryCatalog, ...cliCatalog]) {
      if (!isEmittedOutsideCatalog(code)) dead.push(code);
    }
    expect(dead).toEqual([]);
  });

  it("advisory and warning namespaces do not overlap (one code, one channel)", () => {
    const overlap = [...advisoryCatalog].filter((c) => warningCatalog.has(c));
    expect(overlap).toEqual([]);
  });
});
