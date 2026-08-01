/**
 * Gallery first-screen previews stay eager; the rest stay lazy so cold loads
 * do not pull the full ~2MB PNG corpus up front.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const page = readFileSync(path.join(root, "apps/docs/src/routes/examples/+page.svelte"), "utf8");

describe("docs gallery preview priority", () => {
  it("eagers only the first six results and lazy-loads the rest", () => {
    expect(page).toContain('loading={index < 6 ? "eager" : "lazy"}');
    expect(page).toContain('fetchpriority={index < 6 ? "high" : "low"}');
    expect(page).toContain('decoding="async"');
    expect(page).toContain("content-visibility: auto");
  });
});
