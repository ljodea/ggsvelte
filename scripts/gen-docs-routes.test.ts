import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createDocsRouteInventory } from "./docs-route-inventory.ts";
import { generateDocsRouteProjection } from "./gen-docs-routes.ts";

const generatedPath = join(
  import.meta.dir,
  "..",
  "apps",
  "docs",
  "src",
  "lib",
  "generated",
  "routes.ts",
);

describe("generated docs route projection", () => {
  it("is current and contains only serializable route/navigation facts", async () => {
    const generated = await generateDocsRouteProjection(createDocsRouteInventory());
    expect(readFileSync(generatedPath, "utf8")).toBe(generated);
    expect(generated).not.toContain("import.meta.glob");
    expect(generated).not.toContain("node:");
    expect(generated).not.toContain("$scripts");
  });
});
