import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  allowSoftSkipLoadFailure,
  buildKnownFalsePositives,
  parseSelfHostedLabels,
  parseYamlListScalar,
  prepareSourceForLint,
} from "./actionlint.ts";

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

  it("strips unquoted inline comments from label values", () => {
    // Codex P2: Go CLI reads `ggsvelte`; bare parser must not keep the comment.
    const yaml = `self-hosted-runner:
  labels:
    - ggsvelte # primary pool
    - "keep # hash"
    - 'also # quoted'
`;
    expect(parseSelfHostedLabels(yaml)).toEqual(["ggsvelte", "keep # hash", "also # quoted"]);
  });

  it("parseYamlListScalar handles quotes, escapes, and plain comments", () => {
    expect(parseYamlListScalar("ggsvelte # primary pool")).toBe("ggsvelte");
    expect(parseYamlListScalar('"ggsvelte # literal"')).toBe("ggsvelte # literal");
    expect(parseYamlListScalar("'it''s fine'")).toBe("it's fine");
    expect(parseYamlListScalar("foo#notcomment")).toBe("foo#notcomment");
    expect(parseYamlListScalar('"a\\"b"')).toBe('a"b');
    // Codex P2 on #157: double-quoted YAML escapes must decode, not strip `\`.
    expect(parseYamlListScalar('"runner\\u002darm"')).toBe("runner-arm");
    expect(parseYamlListScalar('"runner\\x2darm"')).toBe("runner-arm");
    expect(parseYamlListScalar('"tab\\tsep"')).toBe("tab\tsep");
  });

  it("builds wasm suppressions from labels plus the vars gap", () => {
    const patterns = buildKnownFalsePositives(["ggsvelte"]);
    expect(patterns.some((re) => re.test('undefined variable "vars"'))).toBe(true);
    expect(patterns.some((re) => re.test('label "ggsvelte" is unknown'))).toBe(true);
    expect(patterns.some((re) => re.test('label "other" is unknown'))).toBe(false);
  });

  it("strips concurrency queue: max for lint-only source (actionlint wasm gap)", () => {
    const raw = `concurrency:
  group: heavy-component
  cancel-in-progress: false
  queue: max
  # comment stays
jobs: {}
`;
    const prepared = prepareSourceForLint(raw);
    expect(prepared).not.toContain("queue: max");
    expect(prepared).toContain("group: heavy-component");
    expect(prepared).toContain("cancel-in-progress: false");
    // Workflows dropped queue: max with the heavy-lane switch (#321); the
    // strip stays so a future reintroduction cannot break the wasm linter.
    expect(read(".github/workflows/ci.yml")).not.toContain("queue: max");
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

describe("actionlint load-failure policy (Codex P1)", () => {
  it("soft-skips only outside CI", () => {
    expect(allowSoftSkipLoadFailure({})).toBe(true);
    expect(allowSoftSkipLoadFailure({ CI: "true" })).toBe(false);
    expect(allowSoftSkipLoadFailure({ GITHUB_ACTIONS: "true" })).toBe(false);
    expect(allowSoftSkipLoadFailure({ CI: "true", GITHUB_ACTIONS: "true" })).toBe(false);
    // Explicit non-true values (e.g. local shells exporting CI=) still allow skip.
    expect(allowSoftSkipLoadFailure({ CI: "1" })).toBe(true);
  });

  it("documents fatal CI path in the runner source", () => {
    const runner = read("scripts/actionlint.ts");
    expect(runner).toContain("allowSoftSkipLoadFailure");
    expect(runner).toContain("process.exit(1)");
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
