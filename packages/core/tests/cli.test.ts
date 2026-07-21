/**
 * ggsvelte-render CLI: runCLI unit tests (exit codes, stdout purity, JSON-line
 * diagnostics) + a smoke test invoking the workspace bin
 * (packages/svelte/bin/ggsvelte-render.js) directly — never network bunx.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CLIIO } from "../src/cli.ts";
import { CLI_OPTIONS, runCLI } from "../src/cli.ts";

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
  it("owns parser, help, and docs option identity in one package-private registry", async () => {
    expect(CLI_OPTIONS.map((option) => option.flag)).toEqual([
      "--width",
      "--height",
      "--data",
      "--max-marks",
      "--version",
      "--help",
    ]);
    expect(CLI_OPTIONS.find((option) => option.flag === "--max-marks")?.anchor).toBe("max-marks");
    const { io, err } = makeIO();
    expect(await runCLI(["--help"], io)).toBe(0);
    for (const option of CLI_OPTIONS) expect(err.join("\n")).toContain(option.flag);
  });

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

  it("maps scale diagnostics onto the documented error|warning|advisory kinds", async () => {
    const temporalSpec = {
      data: {
        values: [
          { when: "1835", value: 1 },
          { when: "2026", value: 2 },
        ],
      },
      aes: { x: { field: "when" }, y: { field: "value" } },
      layers: [{ geom: "point" }],
    };
    const { io, out, err } = makeIO(JSON.stringify(temporalSpec));
    const code = await runCLI([], io);
    expect(code).toBe(0);
    expect(out.join("")).toStartWith("<svg ");
    const lines = err.map((l) => JSON.parse(l) as Record<string, unknown>);
    const kinds = new Set(lines.map((line) => line["kind"]));
    expect(kinds.has("scale-diagnostic")).toBe(false);
    for (const kind of kinds) {
      expect(["error", "warning", "advisory"]).toContain(kind);
    }
    // Temporal inference still surfaces on stderr without inventing a fourth kind.
    expect(
      lines.some(
        (line) =>
          line["source"] === "scale" ||
          (typeof line["code"] === "string" && line["code"].includes("temporal")),
      ) || lines.some((line) => line["kind"] === "advisory"),
    ).toBe(true);
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

  it("--version prints the installed package version without reading stdin", async () => {
    let stdinReads = 0;
    const { io, err, out } = makeIO();
    io.readStdin = () => {
      stdinReads++;
      return Promise.resolve("");
    };

    expect(await runCLI(["--version"], io, { version: "0.3.0" })).toBe(0);
    expect(out).toEqual(["0.3.0\n"]);
    expect(err).toEqual([]);
    expect(stdinReads).toBe(0);
    expect(await runCLI(["--version", "plot.json"], makeIO().io, { version: "0.3.0" })).toBe(2);
    expect(await runCLI(["--version", "--help"], makeIO().io, { version: "0.3.0" })).toBe(2);
  });

  it("--help prints usage to stderr, exit 0", async () => {
    const { io, err, out } = makeIO();
    expect(await runCLI(["--help"], io)).toBe(0);
    expect(out).toHaveLength(0);
    expect(err.join("\n")).toContain("Usage: ggsvelte-render");
  });

  it("--help includes --data detail for the named-dataset JSON shape", async () => {
    const { io, err } = makeIO();
    expect(await runCLI(["--help"], io)).toBe(0);
    const help = err.join("\n");
    const dataOption = CLI_OPTIONS.find((option) => option.flag === "--data");
    expect(dataOption && "detail" in dataOption).toBe(true);
    if (dataOption && "detail" in dataOption) {
      expect(help).toContain(dataOption.detail);
    }
  });
});

describe("workspace bin smoke test", () => {
  it("reports the version of the Svelte package that owns the bin", async () => {
    const packageDirectory = join(import.meta.dir, "..", "..", "svelte");
    const manifest = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as {
      version: string;
    };
    const proc = Bun.spawn(
      ["bun", join(packageDirectory, "bin", "ggsvelte-render.js"), "--version"],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toBe(`${manifest.version}\n`);
    // Bun may emit a host CPU capability warning on stderr before the script runs.
    const cliStderr = stderr
      .split(/\r?\n/)
      .filter(
        (line) =>
          !line.startsWith("warn: CPU lacks AVX support") &&
          !line.includes("bun-darwin-x64-baseline.zip") &&
          line.trim() !== "",
      )
      .join("\n");
    expect(cliStderr).toBe("");
  });

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
