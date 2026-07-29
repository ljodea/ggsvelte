/**
 * Post-build guard: render vs validate package groups stay separate after a
 * docs production build. Skips when build output is absent (unit CI without
 * docs build).
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const serverChunks = path.join(root, "apps/docs/.svelte-kit/output/server/chunks");
const renderChunk = path.join(serverChunks, "ggsvelte-spec.js");
const validateChunk = path.join(serverChunks, "ggsvelte-spec-validate.js");

const hasBuild = existsSync(renderChunk) && existsSync(validateChunk);

describe.skipIf(!hasBuild)("docs ggsvelte-spec render/validate chunk split", () => {
  it("emits separate validate and render named chunks", () => {
    expect(existsSync(validateChunk)).toBe(true);
    expect(existsSync(renderChunk)).toBe(true);
  });

  it("keeps TypeBox compile weight out of the render chunk", () => {
    const render = readFileSync(renderChunk, "utf8");
    const validate = readFileSync(validateChunk, "utf8");
    // Compiled TypeBox validators ship long check templates; render must not.
    const renderCompileHits = (render.match(/Number\.isInteger/g) ?? []).length;
    const validateCompileHits = (validate.match(/Number\.isInteger/g) ?? []).length;
    expect(renderCompileHits).toBeLessThan(5);
    expect(validateCompileHits).toBeGreaterThan(10);
    // Validate path is the heavier of the two (schema graph + compile).
    expect(statSync(validateChunk).size).toBeGreaterThan(statSync(renderChunk).size);
    // Server SSR of the docs site may import the validate chunk for schema
    // catalogs (GEOM_REFERENCE / SCALE_REFERENCE). What matters for chart
    // decode is that TypeBox *compile templates* stay out of the render body
    // (asserted above) and validate-structure* stay TypeBox-free for the gate.
  });

  it("keeps the render chunk well under the pre-split ~1MB client bill", () => {
    const renderBytes = statSync(renderChunk).size;
    const validateBytes = statSync(validateChunk).size;
    // Pre-split client ggsvelte-spec was ~1.05MB; render should stay much smaller.
    expect(renderBytes).toBeLessThan(400_000);
    // Validate path still carries the schema graph (expected).
    expect(validateBytes).toBeGreaterThan(400_000);
  });
});
