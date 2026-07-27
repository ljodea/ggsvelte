/**
 * Diagnostics catalog completeness (#628 / M3 audit).
 *
 * Primary: typed emission registries match catalogs 1:1 (`satisfies Record`).
 * Dual-channel codes must declare a structured emit module — evidence is never
 * recovered from message text for those paths.
 *
 * Secondary: constructor/literal inventory still catches uncatalogued new codes
 * at emission sites that have not yet migrated to typed factories. That scan is
 * not the source of truth for "is this catalog entry intentional?"
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
import {
  ADVISORY_EMISSION_REGISTRY,
  CLI_EMISSION_REGISTRY,
  ERROR_EMISSION_REGISTRY,
  WARNING_EMISSION_REGISTRY,
} from "../src/diagnostics-emission-registry.ts";

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

/** Catalog + registry modules are not emission sites. */
function isCatalogSource(path: string): boolean {
  const name = basename(path);
  return (
    name === "diagnostics.ts" ||
    name === "diagnostics-error-catalog.ts" ||
    name === "diagnostics-warning-catalog.ts" ||
    name === "diagnostics-emission-registry.ts" ||
    name === "diagnostics-emit.ts"
  );
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const emissionFiles = files.filter((f) => !isCatalogSource(f.path));

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

const errorCatalog = new Set(Object.keys(PIPELINE_ERROR_CATALOG));
const warningCatalog = new Set(Object.keys(PIPELINE_WARNING_CATALOG));
const advisoryCatalog = new Set(Object.keys(ADVISORY_CATALOG));
const cliCatalog = new Set(Object.keys(CLI_DIAGNOSTIC_CATALOG));

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).toSorted();
}

describe("diagnostics emission registry (primary completeness, #628)", () => {
  it("warning registry keys match PIPELINE_WARNING_CATALOG exactly", () => {
    expect(sortedKeys(WARNING_EMISSION_REGISTRY)).toEqual(sortedKeys(PIPELINE_WARNING_CATALOG));
  });

  it("advisory registry keys match ADVISORY_CATALOG exactly", () => {
    expect(sortedKeys(ADVISORY_EMISSION_REGISTRY)).toEqual(sortedKeys(ADVISORY_CATALOG));
  });

  it("error registry keys match PIPELINE_ERROR_CATALOG exactly", () => {
    expect(sortedKeys(ERROR_EMISSION_REGISTRY)).toEqual(sortedKeys(PIPELINE_ERROR_CATALOG));
  });

  it("cli registry keys match CLI_DIAGNOSTIC_CATALOG exactly", () => {
    expect(sortedKeys(CLI_EMISSION_REGISTRY)).toEqual(sortedKeys(CLI_DIAGNOSTIC_CATALOG));
  });

  it("dual-channel scale-training codes are owned by diagnostics-emit", () => {
    expect(WARNING_EMISSION_REGISTRY["scale-break-outside-domain"].dualChannelModule).toBe(
      "pipeline/diagnostics-emit",
    );
    expect(ADVISORY_EMISSION_REGISTRY["scale-baseline-transformed-origin"].dualChannelModule).toBe(
      "pipeline/diagnostics-emit",
    );
  });

  it("advisory and warning namespaces do not overlap (one code, one channel)", () => {
    const overlap = [...advisoryCatalog].filter((c) => warningCatalog.has(c));
    expect(overlap).toEqual([]);
  });
});

describe("diagnostics emission inventory (secondary, untyped sites)", () => {
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
});
