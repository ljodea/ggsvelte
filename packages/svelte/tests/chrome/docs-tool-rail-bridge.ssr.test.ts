import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const docsAppCss = readFileSync(
  join(import.meta.dirname, "../../../../apps/docs/src/app.css"),
  "utf8",
);

describe("docs example-frame chrome bridge (#651)", () => {
  it("publishes toolActive and interactionMuted color overrides on .gg-example-frame", () => {
    // Dark theme only reassigns --fg / --muted; overrides reference those vars.
    expect(docsAppCss).toMatch(/\.gg-example-frame\s*\{[^}]*--gg-toolActive:\s*var\(--fg\)/s);
    expect(docsAppCss).toMatch(
      /\.gg-example-frame\s*\{[^}]*--gg-interactionMuted:\s*var\(--muted\)/s,
    );
  });
});
