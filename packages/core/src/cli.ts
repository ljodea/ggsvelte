/**
 * `ggsvelte-render` CLI implementation (plan: the bin lives on the `@ggsvelte/svelte`
 * package — packages/svelte/bin/ggsvelte-render.js is a thin wrapper around
 * this pure-entry module, so the logic is testable without spawning).
 *
 * Contract:
 *   ggsvelte-render [spec.json] [--width N] [--height N] [--data file.json]
 *                   [--max-marks N]
 *
 *   - The spec is read from the file argument, or from stdin when omitted.
 *   - --data file.json provides NAMED datasets: the file is an object mapping
 *     dataset names to inline data ({values}/{columns}/rows/columns).
 *   - SVG goes to stdout. Nothing else ever does.
 *   - Errors and advisories go to stderr as JSON LINES:
 *       {"kind":"error","code",...} | {"kind":"warning",...} |
 *       {"kind":"advisory",...}
 *
 * Exit codes (documented contract):
 *   0  rendered
 *   1  render failed (pipeline/renderer error — spec was structurally valid)
 *   2  usage error (bad flags, unreadable input, invalid JSON)
 *   3  invalid spec (validation errors — see stderr JSON lines)
 */
import type { SpecInput } from "@ggsvelte/spec";
import { lintSpec, SpecValidationError } from "@ggsvelte/spec";

import type { NamedData } from "./pipeline.js";
import { PipelineError, runPipeline } from "./pipeline.js";
import { countMarks, sceneToSVGString } from "./render-svg.js";

export interface CLIIO {
  /** Read the entire stdin as text (used when no file argument is given). */
  readStdin(): Promise<string>;
  readFile(path: string): string;
  writeOut(text: string): void;
  writeErr(line: string): void;
}

export const CLI_OPTIONS = [
  {
    anchor: "width",
    flag: "--width",
    value: "N",
    description: "Plot width in px (default: spec.width, then 640)",
    kind: "number",
    target: "width",
  },
  {
    anchor: "height",
    flag: "--height",
    value: "N",
    description: "Plot height in px (default: spec.height, then 400)",
    kind: "number",
    target: "height",
  },
  {
    anchor: "data",
    flag: "--data",
    value: "FILE",
    description: "JSON file with named datasets",
    detail: '{"name": rows|columns|{values}|{columns}}',
    kind: "file",
    target: "dataPath",
  },
  {
    anchor: "max-marks",
    flag: "--max-marks",
    value: "N",
    description: "Refuse to render more marks than N (default 100000)",
    kind: "number",
    target: "maxMarks",
  },
  {
    anchor: "version",
    flag: "--version",
    value: "",
    description: "Print the installed @ggsvelte/svelte version",
    kind: "boolean",
    target: "version",
  },
  {
    anchor: "help",
    flag: "--help",
    aliases: ["-h"],
    value: "",
    description: "Show this help",
    kind: "boolean",
    target: "help",
  },
] as const;

const cliOptionLines = CLI_OPTIONS.map((option) => {
  const signature = `${option.flag}${option.value === "" ? "" : ` ${option.value}`}`;
  return `  ${signature.padEnd(17)} ${option.description}`;
}).join("\n");

const USAGE = `Usage: ggsvelte-render [spec.json] [options]

Renders a ggsvelte plot spec (JSON) to SVG on stdout. Reads the spec from
the file argument, or from stdin when omitted.

Options:
${cliOptionLines}

Diagnostics are JSON lines on stderr. Exit codes: 0 rendered, 1 render
failed, 2 usage error, 3 invalid spec.`;

interface ParsedArgs {
  specPath: string | null;
  width: number | null;
  height: number | null;
  dataPath: string | null;
  maxMarks: number | null;
  help: boolean;
  version: boolean;
}

class UsageError extends Error {}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = {
    specPath: null,
    width: null,
    height: null,
    dataPath: null,
    maxMarks: null,
    help: false,
    version: false,
  };
  const optionByFlag = new Map<string, (typeof CLI_OPTIONS)[number]>();
  for (const option of CLI_OPTIONS) {
    optionByFlag.set(option.flag, option);
    if ("aliases" in option) {
      for (const alias of option.aliases) optionByFlag.set(alias, option);
    }
  }
  const numberFlag = (flag: string, raw: string | undefined): number => {
    const n = Number(raw);
    if (raw === undefined || !Number.isFinite(n) || n <= 0) {
      throw new UsageError(`${flag} needs a positive number (got ${raw ?? "nothing"})`);
    }
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const option = optionByFlag.get(arg);
    if (option !== undefined) {
      if (option.kind === "boolean") {
        out[option.target] = true;
      } else if (option.kind === "number") {
        out[option.target] = numberFlag(option.flag, argv[++i]);
      } else {
        const path = argv[++i];
        if (path === undefined) throw new UsageError(`${option.flag} needs a file path`);
        out[option.target] = path;
      }
      continue;
    }
    if (arg.startsWith("-")) throw new UsageError(`Unknown option "${arg}"`);
    if (out.specPath !== null) {
      throw new UsageError(`Unexpected extra argument "${arg}" (one spec file only)`);
    }
    out.specPath = arg;
  }
  return out;
}

function errLine(io: CLIIO, payload: Record<string, unknown>): void {
  io.writeErr(JSON.stringify(payload));
}

function parseJSON(io: CLIIO, text: string, what: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch (error) {
    errLine(io, {
      kind: "error",
      code: "invalid-json",
      message: `${what} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

export interface CLIRunOptions {
  /** Version of the package that owns the installed ggsvelte-render bin. */
  version?: string;
}

/** Run the CLI. Returns the process exit code (documented in module docs). */
export async function runCLI(
  argv: readonly string[],
  io: CLIIO,
  options: CLIRunOptions = {},
): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    errLine(io, { kind: "error", code: "usage", message: (error as Error).message });
    io.writeErr(USAGE);
    return 2;
  }
  if (args.version) {
    const hasOtherArguments =
      args.help ||
      args.specPath !== null ||
      args.width !== null ||
      args.height !== null ||
      args.dataPath !== null ||
      args.maxMarks !== null;
    if (hasOtherArguments || options.version === undefined) {
      errLine(io, {
        kind: "error",
        code: "usage",
        message: hasOtherArguments
          ? "--version must be used without a spec or other options"
          : "--version is unavailable from this programmatic runner",
      });
      io.writeErr(USAGE);
      return 2;
    }
    io.writeOut(`${options.version}\n`);
    return 0;
  }
  if (args.help) {
    io.writeErr(USAGE);
    return 0;
  }

  let specText: string;
  try {
    specText = args.specPath === null ? await io.readStdin() : io.readFile(args.specPath);
  } catch (error) {
    errLine(io, {
      kind: "error",
      code: "unreadable-input",
      message: `Cannot read ${args.specPath ?? "stdin"}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return 2;
  }
  const parsedSpec = parseJSON(io, specText, args.specPath ?? "stdin");
  if (parsedSpec === null) return 2;
  const spec = parsedSpec.value;

  let data: Record<string, NamedData> | undefined;
  if (args.dataPath !== null) {
    let dataText: string;
    try {
      dataText = io.readFile(args.dataPath);
    } catch (error) {
      errLine(io, {
        kind: "error",
        code: "unreadable-input",
        message: `Cannot read ${args.dataPath}: ${error instanceof Error ? error.message : String(error)}`,
      });
      return 2;
    }
    const parsedData = parseJSON(io, dataText, args.dataPath);
    if (parsedData === null) return 2;
    const parsed = parsedData.value;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      errLine(io, {
        kind: "error",
        code: "invalid-data-file",
        message: "--data must be a JSON object mapping dataset names to inline data.",
      });
      return 2;
    }
    data = parsed as Record<string, NamedData>;
  }

  const specRecord =
    typeof spec === "object" && spec !== null ? (spec as Record<string, unknown>) : {};
  const width = args.width ?? (typeof specRecord["width"] === "number" ? specRecord["width"] : 640);
  const height =
    args.height ?? (typeof specRecord["height"] === "number" ? specRecord["height"] : 400);

  try {
    const model = runPipeline(spec as SpecInput, {
      width,
      height,
      ...(data !== undefined && { data }),
    });
    for (const warning of model.warnings) errLine(io, { kind: "warning", ...warning });
    for (const advisory of model.advisories) errLine(io, { kind: "advisory", ...advisory });
    // Spec-lint advisories (Hadley lesson 16): valid-but-questionable specs.
    // Distinguished from pipeline heuristics by source: "spec-lint".
    for (const advisory of lintSpec(spec)) {
      errLine(io, { kind: "advisory", source: "spec-lint", ...advisory });
    }
    const limit = args.maxMarks ?? 100_000;
    const marks = countMarks(model.scene);
    if (marks > limit) {
      errLine(io, {
        kind: "error",
        code: "max-marks-exceeded",
        message: `The plot renders ${marks} marks, more than --max-marks (${limit}).`,
      });
      return 1;
    }
    io.writeOut(sceneToSVGString(model.scene) + "\n");
    return 0;
  } catch (error) {
    if (error instanceof SpecValidationError) {
      for (const e of error.errors) {
        errLine(io, { kind: "error", ...e });
      }
      return 3;
    }
    if (error instanceof PipelineError) {
      errLine(io, { kind: "error", code: error.code, path: error.path, message: error.message });
      return 1;
    }
    errLine(io, {
      kind: "error",
      code: "internal",
      message: error instanceof Error ? error.message : String(error),
    });
    return 1;
  }
}
