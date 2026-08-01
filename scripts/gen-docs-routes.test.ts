import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createDocsRouteInventory } from "./docs-route-inventory.ts";
import {
  generateDocsGuideNavigationProjection,
  generateDocsRouteProjection,
} from "./gen-docs-routes.ts";

const generatedDir = join(import.meta.dir, "..", "apps", "docs", "src", "lib", "generated");
const routesPath = join(generatedDir, "routes.ts");
const guideNavPath = join(generatedDir, "guide-navigation.ts");

describe("generated docs route projection", () => {
  it("is current and contains only serializable route facts (no guide nav)", async () => {
    const inventory = createDocsRouteInventory();
    const generated = await generateDocsRouteProjection(inventory);
    expect(readFileSync(routesPath, "utf8")).toBe(generated);
    expect(generated).toContain("export const DOCS_ROUTES");
    expect(generated).not.toContain("GUIDE_NAVIGATION");
    expect(generated).not.toContain("import.meta.glob");
    expect(generated).not.toContain("node:");
    expect(generated).not.toContain("$scripts");
  });

  it("emits a separate guide-navigation projection for the client shell", async () => {
    const inventory = createDocsRouteInventory();
    const generated = await generateDocsGuideNavigationProjection(inventory);
    expect(readFileSync(guideNavPath, "utf8")).toBe(generated);
    expect(generated).toContain("export const GUIDE_NAVIGATION");
    expect(generated).not.toContain("DOCS_ROUTES");
    expect(generated).not.toContain("import.meta.glob");
  });
});
