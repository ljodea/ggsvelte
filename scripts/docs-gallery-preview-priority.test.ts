/**
 * Gallery first-screen previews stay eager; the rest stay lazy so cold loads
 * do not pull the full ~2MB PNG corpus up front. content-visibility must not
 * clip keyboard focus rings (#1364).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const page = readFileSync(path.join(root, "apps/docs/src/routes/examples/+page.svelte"), "utf8");

describe("docs gallery preview priority", () => {
  it("eagers a small first-screen window and reserves high priority for LCP only (#1364)", () => {
    // One column on phones (~17rem min); eager budget must not assume six columns.
    expect(page).toContain('loading={index < 2 ? "eager" : "lazy"}');
    // fetchpriority high is diluted when applied to many images — only the LCP candidate.
    expect(page).toContain('fetchpriority={index === 0 ? "high" : "low"}');
    expect(page).toContain('decoding="async"');
    expect(page).toContain("content-visibility: auto");
  });

  it("leaves room for focus outlines under content-visibility paint containment (#1364)", () => {
    // content-visibility implies paint containment; outline-offset:3px is clipped
    // unless the <li> padding box includes the outline.
    expect(page).toMatch(/\.example-grid\s*>\s*li\s*\{[^}]*content-visibility:\s*auto/s);
    expect(page).toMatch(/\.example-grid\s*>\s*li\s*\{[^}]*padding:\s*0\.4rem/s);
  });
});
