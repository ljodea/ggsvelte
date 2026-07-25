import { describe, expect, test } from "bun:test";

import {
  decideApproveAction,
  decidePrCreation,
  parseBooleanFlag,
  parseOpenPrNumber,
  type BranchState,
} from "./vr-approve-decision.ts";

/** What `process.env.X` yields when the workflow never set X. */
const UNSET: string | undefined = undefined;

const RENDER = "03c476e200271961f1f25ad4d1878caf1d9a9747";
const OLD_RENDER = "1111111111111111111111111111111111111111";
const TIP = "2222222222222222222222222222222222222222";

const branch = (overrides: Partial<BranchState> = {}): BranchState => ({
  tipSha: TIP,
  tipMessage: `vr: update baselines for PR #680 @ ${RENDER}`,
  tipLandedOnDefault: false,
  openPrNumber: null,
  ...overrides,
});

describe("decideApproveAction", () => {
  test("no vr-update branch yet → render", () => {
    const decision = decideApproveAction(RENDER, branch({ tipSha: "", tipMessage: "" }));
    expect(decision.action).toBe("render");
    expect(decision.reason).toContain("does not exist");
  });

  test("branch tip carries an older render → render", () => {
    const decision = decideApproveAction(
      RENDER,
      branch({ tipMessage: `vr: update baselines for PR #680 @ ${OLD_RENDER}` }),
    );
    expect(decision.action).toBe("render");
  });

  test("branch tip carries this render but no PR is open → open the PR (issue #717)", () => {
    const decision = decideApproveAction(RENDER, branch());
    expect(decision.action).toBe("open-pr");
    expect(decision.reason).toContain("no open PR");
  });

  test("branch tip carries this render and a PR is open → skip", () => {
    const decision = decideApproveAction(RENDER, branch({ openPrNumber: 716 }));
    expect(decision.action).toBe("skip");
    expect(decision.reason).toContain("#716");
  });

  test("baselines already landed on the default branch → skip, never re-open a PR", () => {
    const decision = decideApproveAction(RENDER, branch({ tipLandedOnDefault: true }));
    expect(decision.action).toBe("skip");
    expect(decision.reason).toContain("default branch");
  });

  test("landed check does not suppress a fresh render on a stale branch", () => {
    const decision = decideApproveAction(
      RENDER,
      branch({ tipMessage: `vr: baselines @ ${OLD_RENDER}`, tipLandedOnDefault: true }),
    );
    expect(decision.action).toBe("render");
  });

  test("an open PR on a stale branch still renders — the push updates that PR", () => {
    const decision = decideApproveAction(
      RENDER,
      branch({ tipMessage: `vr: baselines @ ${OLD_RENDER}`, openPrNumber: 716 }),
    );
    expect(decision.action).toBe("render");
  });

  test("a render SHA embedded in a longer hex string does not count", () => {
    expect(
      decideApproveAction(RENDER, branch({ tipMessage: `vr: baselines @ ${RENDER.slice(0, 39)}f` }))
        .action,
    ).toBe("render");
    expect(
      decideApproveAction(RENDER, branch({ tipMessage: `vr: baselines @ ${RENDER}abc` })).action,
    ).toBe("render");
  });

  test("the render SHA is recognized wherever it sits in the message", () => {
    expect(decideApproveAction(RENDER, branch({ tipMessage: `${RENDER} baselines` })).action).toBe(
      "open-pr",
    );
    expect(
      decideApproveAction(RENDER, branch({ tipMessage: `baselines (${RENDER})` })).action,
    ).toBe("open-pr");
  });

  test("rejects a malformed render SHA rather than guessing", () => {
    expect(() => decideApproveAction("not-a-sha", branch())).toThrow(/render SHA/);
    expect(() => decideApproveAction(RENDER.toUpperCase(), branch())).toThrow(/render SHA/);
  });

  test("rejects a malformed branch tip SHA rather than guessing", () => {
    expect(() => decideApproveAction(RENDER, branch({ tipSha: "HEAD" }))).toThrow(/tip SHA/);
  });
});

describe("decidePrCreation", () => {
  test("skip decisions never create a PR", () => {
    expect(decidePrCreation({ action: "skip", pushed: false, openPrNumber: null }).create).toBe(
      false,
    );
  });

  test("open-pr with no open PR creates one", () => {
    const decision = decidePrCreation({ action: "open-pr", pushed: false, openPrNumber: null });
    expect(decision.create).toBe(true);
  });

  test("a PR opened between the decision and the push is not duplicated", () => {
    const decision = decidePrCreation({ action: "open-pr", pushed: false, openPrNumber: 716 });
    expect(decision.create).toBe(false);
    expect(decision.reason).toContain("#716");
  });

  test("a fresh push with no open PR creates one", () => {
    expect(decidePrCreation({ action: "render", pushed: true, openPrNumber: null }).create).toBe(
      true,
    );
  });

  test("a fresh push onto an already-open PR creates nothing", () => {
    expect(decidePrCreation({ action: "render", pushed: true, openPrNumber: 716 }).create).toBe(
      false,
    );
  });

  test("render that produced no commit has no branch to open a PR for", () => {
    const decision = decidePrCreation({ action: "render", pushed: false, openPrNumber: null });
    expect(decision.create).toBe(false);
    expect(decision.reason).toContain("no baseline changes");
  });
});

describe("parseOpenPrNumber", () => {
  test("empty and unset mean no open PR", () => {
    expect(parseOpenPrNumber(UNSET)).toBeNull();
    expect(parseOpenPrNumber("")).toBeNull();
    expect(parseOpenPrNumber("  ")).toBeNull();
  });

  test("a positive integer is the PR number", () => {
    expect(parseOpenPrNumber("716")).toBe(716);
  });

  test("rejects non-numeric and non-positive values", () => {
    expect(() => parseOpenPrNumber("0")).toThrow(/open PR number/);
    expect(() => parseOpenPrNumber("-1")).toThrow(/open PR number/);
    expect(() => parseOpenPrNumber("7.5")).toThrow(/open PR number/);
    expect(() => parseOpenPrNumber("716 717")).toThrow(/open PR number/);
  });
});

describe("parseBooleanFlag", () => {
  test("accepts only explicit booleans", () => {
    expect(parseBooleanFlag("true", "pushed")).toBe(true);
    expect(parseBooleanFlag("false", "pushed")).toBe(false);
    expect(() => parseBooleanFlag("", "pushed")).toThrow(/pushed/);
    expect(() => parseBooleanFlag(UNSET, "pushed")).toThrow(/pushed/);
    expect(() => parseBooleanFlag("yes", "pushed")).toThrow(/pushed/);
  });
});

/** Run the CLI exactly as the workflow does: env in, GITHUB_OUTPUT out. */
const run = async (args: string[], env: Record<string, string>) => {
  const outputFile = `${process.env["TMPDIR"] ?? "/tmp"}/vr-approve-decision-${args[0]}-${Bun.hash(JSON.stringify(env)).toString(16)}.txt`;
  await Bun.write(outputFile, "");
  const proc = Bun.spawn(["bun", `${import.meta.dir}/vr-approve-decision.ts`, ...args], {
    env: { ...process.env, ...env, GITHUB_OUTPUT: outputFile },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const outputs = await Bun.file(outputFile).text();
  return { stdout, stderr, exitCode, outputs };
};

describe("CLI", () => {
  test("action subcommand writes the decision to GITHUB_OUTPUT", async () => {
    const result = await run(["action"], {
      RENDER_SHA: RENDER,
      BRANCH_TIP_SHA: TIP,
      BRANCH_TIP_MESSAGE: `vr: update baselines for PR #680 @ ${RENDER}`,
      BRANCH_TIP_LANDED: "false",
      OPEN_PR_NUMBER: "",
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs).toContain("action=open-pr");
    expect(result.outputs).toMatch(/^reason=.+$/m);
  });

  test("action subcommand reports skip when the PR is already open", async () => {
    const result = await run(["action"], {
      RENDER_SHA: RENDER,
      BRANCH_TIP_SHA: TIP,
      BRANCH_TIP_MESSAGE: `vr: update baselines for PR #680 @ ${RENDER}`,
      BRANCH_TIP_LANDED: "false",
      OPEN_PR_NUMBER: "716",
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs).toContain("action=skip");
  });

  test("pr-create subcommand writes the creation decision", async () => {
    const result = await run(["pr-create"], {
      ACTION: "render",
      PUSHED: "true",
      OPEN_PR_NUMBER: "",
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs).toContain("create=true");
  });

  test("fails loudly on a malformed render SHA", async () => {
    const result = await run(["action"], {
      RENDER_SHA: "nope",
      BRANCH_TIP_SHA: "",
      BRANCH_TIP_MESSAGE: "",
      BRANCH_TIP_LANDED: "false",
      OPEN_PR_NUMBER: "",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("render SHA");
  });

  test("rejects an unknown subcommand", async () => {
    const result = await run(["nonsense"], {});
    expect(result.exitCode).not.toBe(0);
  });
});
