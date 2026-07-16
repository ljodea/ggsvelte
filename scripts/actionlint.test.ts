import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildKnownFalsePositives, parseSelfHostedLabels } from "./actionlint.ts";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("actionlint self-hosted label config", () => {
  it("parses labels from actionlint.yaml list form", () => {
    const yaml = `self-hosted-runner:
  labels:
    - ggsvelte
    - "linux-arm"
`;
    expect(parseSelfHostedLabels(yaml)).toEqual(["ggsvelte", "linux-arm"]);
  });

  it("ignores comments and stops at the next key", () => {
    const yaml = `
self-hosted-runner:
  labels:
    # primary label
    - ggsvelte
  other: true
labels:
  - not-under-self-hosted
`;
    expect(parseSelfHostedLabels(yaml)).toEqual(["ggsvelte"]);
  });

  it("builds wasm suppressions from labels plus the vars gap", () => {
    const patterns = buildKnownFalsePositives(["ggsvelte"]);
    expect(patterns.some((re) => re.test('undefined variable "vars"'))).toBe(true);
    expect(patterns.some((re) => re.test('label "ggsvelte" is unknown'))).toBe(true);
    expect(patterns.some((re) => re.test('label "other" is unknown'))).toBe(false);
  });

  it("keeps .github/actionlint.yaml labels wired into the wasm runner", () => {
    // Drift guard: labels live only in the Go CLI config file; the wasm
    // runner must derive suppressions from that file (not a parallel list).
    const yaml = read(".github/actionlint.yaml");
    const labels = parseSelfHostedLabels(yaml);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels).toContain("ggsvelte");

    const runner = read("scripts/actionlint.ts");
    expect(runner).toContain("parseSelfHostedLabels");
    expect(runner).toContain(".github/actionlint.yaml");
    // Hard-coded label list would reintroduce the drift the issue filed.
    expect(runner).not.toMatch(/KNOWN_FALSE_POSITIVES\s*=\s*\[/);
  });
});

describe("workflow lint local gates (issue #155)", () => {
  it("wires actionlint into the pre-push stage, gated on .github/", () => {
    const hooks = read(".pre-commit-config.yaml");
    expect(hooks).toMatch(/id:\s*actionlint/);
    expect(hooks).toContain("bun run lint:actions");
    expect(hooks).toMatch(/files:\s*\^\\.github\//);
    // actionlint hook must be pre-push, not pre-commit (heavier, CI-parity).
    const actionlintBlock = hooks.slice(hooks.indexOf("id: actionlint"));
    const nextHook = actionlintBlock.indexOf("\n      - id:");
    const block = nextHook === -1 ? actionlintBlock : actionlintBlock.slice(0, nextHook);
    expect(block).toContain("stages: [pre-push]");
  });

  it("wires zizmor into the pre-push stage with a graceful skip wrapper", () => {
    const hooks = read(".pre-commit-config.yaml");
    expect(hooks).toMatch(/id:\s*zizmor/);
    expect(hooks).toContain("scripts/guards/zizmor-or-skip.sh");
    const zizmorBlock = hooks.slice(hooks.indexOf("id: zizmor"));
    const nextHook = zizmorBlock.indexOf("\n      - id:");
    const block = nextHook === -1 ? zizmorBlock : zizmorBlock.slice(0, nextHook);
    expect(block).toContain("stages: [pre-push]");
    expect(block).toMatch(/files:\s*\^\\.github\//);

    const guard = read("scripts/guards/zizmor-or-skip.sh");
    expect(guard).toContain("command -v zizmor");
    expect(guard).toContain("skipping local gate");
  });

  it("keeps package scripts for actionlint and zizmor", () => {
    const pkg = read("package.json");
    expect(pkg).toContain('"lint:actions": "bun scripts/actionlint.ts"');
    expect(pkg).toContain('"lint:actions:security": "zizmor .github/workflows"');
  });
});
