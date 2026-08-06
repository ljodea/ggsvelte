/**
 * Programmatic surface of @ggsvelte/cli (`src/index.ts`).
 *
 * Bin smoke tests only spawn `bin/ggsvelte-render.js`, which imports
 * `@ggsvelte/core` directly — so they never load this package's entry and
 * never appear under the Codecov `packages-cli` component. Importing the
 * re-export here is what puts `packages/cli/src/**` into unit lcov.
 */
import { describe, expect, it } from "bun:test";
import type { CLIIO } from "../src/index.ts";
import { runCLI } from "../src/index.ts";

const SPEC = {
  data: {
    values: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  },
  aes: { x: { field: "x" }, y: { field: "y" } },
  layers: [{ geom: "point" }],
};

function makeIO(stdin = ""): { io: CLIIO; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: {
      readStdin: () => Promise.resolve(stdin),
      readFile: (path) => {
        throw new Error(`ENOENT: ${path}`);
      },
      writeOut: (text) => {
        out.push(text);
      },
      writeErr: (line) => {
        err.push(line);
      },
    },
  };
}

describe("@ggsvelte/cli surface (src/index.ts)", () => {
  it("re-exports runCLI that renders a point chart to SVG", async () => {
    expect(typeof runCLI).toBe("function");
    const { io, out } = makeIO(JSON.stringify(SPEC));
    const code = await runCLI([], io);
    expect(code).toBe(0);
    expect(out.join("")).toStartWith("<svg ");
    expect(out.join("").trimEnd()).toEndWith("</svg>");
  });

  it("re-exports runCLI that honors the version option", async () => {
    const { io, out, err } = makeIO();
    const code = await runCLI(["--version"], io, { version: "0.0.0-test" });
    expect(code).toBe(0);
    expect(out).toEqual(["0.0.0-test\n"]);
    expect(err).toEqual([]);
  });
});
