import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  PLAYGROUND_MAX_DECODED_BYTES,
  type PlaygroundSeedV1,
} from "../apps/docs/src/lib/playground-codec";
import {
  serializePlaygroundSpec,
  validatePlaygroundDraft,
} from "../apps/docs/src/lib/playground-draft-validate";

const baseSpec: PortableSpec = {
  edition: 1,
  data: {
    values: [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ],
  },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    },
  ],
  labs: { title: "Baseline" },
};

describe("validatePlaygroundDraft", () => {
  test("accepts a valid draft and returns custom seed with canonical draft", () => {
    const draft = JSON.stringify(baseSpec);
    const result = validatePlaygroundDraft(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec).toEqual(baseSpec);
    expect(result.canonicalDraft).toBe(serializePlaygroundSpec(baseSpec));
    expect(result.seed).toEqual({
      version: 1,
      source: { kind: "custom" },
      spec: baseSpec,
    } satisfies PlaygroundSeedV1);
    // Seed is the raw custom envelope, not a codec-clamped object identity change.
    expect(result.seed.spec).toBe(result.spec);
  });

  test("maps invalid JSON to an exact playground diagnostic", () => {
    const result = validatePlaygroundDraft("{");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.source).toBe("playground");
    expect(result.diagnostics[0]?.code).toBe("invalid-json");
    expect(result.diagnostics[0]?.path).toBe("");
    expect(result.diagnostics[0]?.fix).toBe(
      "Check quotes, commas, and brackets, then apply again.",
    );
    expect(result.diagnostics[0]?.message.length).toBeGreaterThan(0);
  });

  test("rejects oversized raw draft before parse as share-limit", () => {
    const result = validatePlaygroundDraft("x".repeat(PLAYGROUND_MAX_DECODED_BYTES + 1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toEqual([
      {
        source: "playground",
        code: "share-limit",
        path: "",
        message: `Playground JSON must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
        fix: "Use a smaller portable spec.",
      },
    ]);
  });

  test("maps schema failures to validation diagnostics", () => {
    const result = validatePlaygroundDraft(JSON.stringify({ ...baseSpec, layers: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.source).toBe("validation");
    expect(result.diagnostics[0]?.code).toBeTruthy();
    expect(result.diagnostics[0]?.path).toBeDefined();
    expect(result.diagnostics[0]?.message.length).toBeGreaterThan(0);
  });

  test("rejects drafts that pass schema/limits but fail seed bounds as share-limit", () => {
    // PortableSpec validate does not enforce playground string code-point caps;
    // validatePlaygroundSeed does — that path must stay mapped to share-limit.
    const tooLongTitle = "a".repeat(2_049);
    const draft = JSON.stringify({
      ...baseSpec,
      labs: { title: tooLongTitle },
    });
    expect(new TextEncoder().encode(draft).byteLength).toBeLessThanOrEqual(
      PLAYGROUND_MAX_DECODED_BYTES,
    );
    const result = validatePlaygroundDraft(draft);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toEqual([
      {
        source: "playground",
        code: "share-limit",
        path: "",
        message: "Shared playground strings must contain at most 2048 Unicode code points.",
        fix: "Use a smaller portable spec.",
      },
    ]);
  });
});

describe("serializePlaygroundSpec", () => {
  test("pretty-prints when under the share byte budget and collapses when needed", () => {
    const pretty = serializePlaygroundSpec(baseSpec);
    expect(pretty).toContain("\n");
    expect(JSON.parse(pretty)).toEqual(baseSpec);
  });
});
