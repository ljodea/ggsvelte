import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PortableSpec } from "@ggsvelte/spec";

import { EXAMPLES } from "../examples/manifest";
import { PLAYGROUND_SAMPLES } from "../apps/docs/src/lib/playground-samples";
import { evaluatePlaygroundCompatibility, generatePlaygroundSeeds } from "./gen-playground-seeds";

const validSpec: PortableSpec = {
  edition: 1,
  data: { values: [{ x: 1, y: 2 }] },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    },
  ],
};

describe("generated playground seeds", () => {
  test("keeps exact compatible specs and gives stable reasons for bounded failures", () => {
    const supported = evaluatePlaygroundCompatibility(
      { kind: "example", id: "point/small" },
      validSpec,
    );
    expect(supported.supported).toBe(true);
    if (supported.supported) {
      expect(supported.seed.spec).toEqual(validSpec);
      expect(supported.fragment).toMatch(/^#play=v1\./u);
    }

    const oversized = evaluatePlaygroundCompatibility(
      { kind: "example", id: "point/large" },
      {
        ...validSpec,
        data: {
          values: Array.from({ length: 501 }, (_, index) => ({ x: index, y: index })),
        },
      },
    );
    expect(oversized).toEqual({
      supported: false,
      reason: "This example has more than 500 inline rows. Use a smaller sample in the playground.",
    });
  });

  test("emits every supplied example and sample exactly once", async () => {
    const root = mkdtempSync(join(tmpdir(), "ggsvelte-playground-seeds-"));
    const output = join(root, "playground-seeds.ts");
    try {
      await generatePlaygroundSeeds({
        output,
        entries: [
          { id: "point/small", title: "Small points" },
          { id: "point/large", title: "Large points" },
        ],
        samples: [PLAYGROUND_SAMPLES[0]],
        loadSpec: (id) =>
          Promise.resolve(
            id === "point/small"
              ? validSpec
              : {
                  ...validSpec,
                  data: {
                    values: Array.from({ length: 501 }, (_, index) => ({ x: index, y: index })),
                  },
                },
          ),
      });
      const source = readFileSync(output, "utf8");
      expect(source.match(/point\/small/gu)).toHaveLength(1); // exact closed registry id
      expect(source).toContain("point/large");
      expect(source).toContain("starter-scatter");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("keeps the freshness gate in docs builds and checks", () => {
    const manifest = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "apps", "docs", "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    for (const script of [manifest.scripts["build"], manifest.scripts["check"]]) {
      expect(script).toContain("bun ../../scripts/gen-playground-seeds.ts --check");
    }
  });

  test("repository registry covers the canonical manifest and closed samples", async () => {
    await generatePlaygroundSeeds({ check: true });
    const generated = await import("../apps/docs/src/lib/generated/playground-seeds");
    expect(generated.PLAYGROUND_EXAMPLES.map((entry) => entry.id)).toEqual(
      EXAMPLES.map((entry) => entry.id),
    );
    expect(new Set(generated.PLAYGROUND_EXAMPLES.map((entry) => entry.id)).size).toBe(
      EXAMPLES.length,
    );
    expect(generated.PLAYGROUND_SAMPLES.map((entry) => entry.id)).toEqual(
      PLAYGROUND_SAMPLES.map((entry) => entry.id),
    );
    expect(
      generated.PLAYGROUND_EXAMPLES.find((entry) => entry.id === "point/canvas-scatter")
        ?.compatibility,
    ).toEqual({
      supported: false,
      reason: "This example has more than 500 inline rows. Use a smaller sample in the playground.",
    });
    expect(
      generated.PLAYGROUND_EXAMPLES.find((entry) => entry.id === "interaction/brush-zoom")
        ?.compatibility,
    ).toEqual({
      supported: false,
      reason:
        "This example is larger than the 12 KiB share limit. Open a smaller example or sample.",
    });
  }, 15_000); // Full Linux coverage consistently takes ~5.35s; keep the integrity check intact.
});
