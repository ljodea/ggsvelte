/**
 * ggsvelte-render CLI: runCLI unit tests (exit codes, stdout purity, JSON-line
 * diagnostics) + a smoke test invoking the workspace bin
 * (packages/svelte/bin/ggsvelte-render.js) directly — never network bunx.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CLIIO } from "../src/cli.ts";
import { runCLI } from "../src/cli.ts";

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

interface Captured {
  io: CLIIO;
  out: string[];
  err: string[];
}

function makeIO(stdin = "", files: Record<string, string> = {}): Captured {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: {
      readStdin: () => Promise.resolve(stdin),
      readFile: (path) => {
        const content = files[path];
        if (content === undefined) throw new Error(`ENOENT: ${path}`);
        return content;
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

describe("runCLI", () => {
  it("renders a spec from stdin: SVG on stdout, advisories as stderr JSON lines", async () => {
    const { io, out, err } = makeIO(JSON.stringify(SPEC));
    const code = await runCLI([], io);
    expect(code).toBe(0);
    expect(out.join("")).toStartWith("<svg ");
    expect(out.join("").trimEnd()).toEndWith("</svg>");
    const lines = err.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines.some((l) => l["kind"] === "advisory" && l["code"] === "scale-type-inferred")).toBe(
      true,
    );
  });

  it("renders a spec from a file with --width/--height", async () => {
    const { io, out } = makeIO("", { "spec.json": JSON.stringify(SPEC) });
    const code = await runCLI(["spec.json", "--width", "300", "--height", "200"], io);
    expect(code).toBe(0);
    expect(out.join("")).toContain('width="300" height="200"');
  });

  it("--data resolves named datasets", async () => {
    const spec = { ...SPEC, data: { name: "pts" } };
    const { io, out } = makeIO("", {
      "spec.json": JSON.stringify(spec),
      "data.json": JSON.stringify({ pts: { values: [{ x: 1, y: 2 }] } }),
    });
    const code = await runCLI(["spec.json", "--data", "data.json"], io);
    expect(code).toBe(0);
    expect(out.join("")).toContain("<circle");
  });

  it("exit 3 for invalid specs, with the agent error contract on stderr", async () => {
    const { io, out, err } = makeIO(JSON.stringify({ layers: [{ geom: "poit" }] }));
    const code = await runCLI([], io);
    expect(code).toBe(3);
    expect(out).toHaveLength(0); // stdout stays pure
    const first = JSON.parse(err[0]!) as Record<string, unknown>;
    expect(first["kind"]).toBe("error");
    expect(first["code"]).toBe("unknown-geom");
    expect(String(first["message"])).toContain('Did you mean "point"?');
  });

  it("exit 1 for render failures (unknown dataset)", async () => {
    const { io, err } = makeIO(JSON.stringify({ ...SPEC, data: { name: "nope" } }));
    const code = await runCLI([], io);
    expect(code).toBe(1);
    expect((JSON.parse(err[0]!) as Record<string, unknown>)["code"]).toBe("unknown-dataset");
  });

  it("exit 1 when --max-marks is exceeded", async () => {
    const { io } = makeIO(JSON.stringify(SPEC));
    expect(await runCLI(["--max-marks", "1"], io)).toBe(1);
  });

  it("exit 2 for usage errors and unreadable/invalid input", async () => {
    expect(await runCLI(["--bogus"], makeIO().io)).toBe(2);
    expect(await runCLI(["missing.json"], makeIO().io)).toBe(2);
    expect(await runCLI([], makeIO("not json{").io)).toBe(2);
    expect(await runCLI(["--width", "abc"], makeIO().io)).toBe(2);
  });

  it("--help prints usage to stderr, exit 0", async () => {
    const { io, err, out } = makeIO();
    expect(await runCLI(["--help"], io)).toBe(0);
    expect(out).toHaveLength(0);
    expect(err.join("\n")).toContain("Usage: ggsvelte-render");
  });
});

describe("workspace bin smoke test", () => {
  it("bun packages/svelte/bin/ggsvelte-render.js spec.json > out.svg", async () => {
    const binPath = join(import.meta.dir, "..", "..", "svelte", "bin", "ggsvelte-render.js");
    const dir = mkdtempSync(join(tmpdir(), "ggsvelte-cli-"));
    const specPath = join(dir, "spec.json");
    writeFileSync(specPath, JSON.stringify(SPEC));
    const proc = Bun.spawn(["bun", binPath, specPath, "--width", "320"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(exitCode).toBe(0);
    expect(stdout).toStartWith("<svg ");
    expect(stdout.trimEnd()).toEndWith("</svg>");
    expect(stdout).toContain('width="320"');
  }, 20_000);
});
