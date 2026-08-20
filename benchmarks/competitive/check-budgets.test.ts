import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type Timing = {
  total: number;
  sync: number;
};

type GateFixture = {
  ggsvelte: Timing;
  peer: Timing;
  knownGap?: boolean;
};

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runGate({ ggsvelte, peer, knownGap = false }: GateFixture) {
  const directory = mkdtempSync(path.join(tmpdir(), "ggsvelte-competitive-budget-"));
  temporaryDirectories.push(directory);
  cpSync(new URL("./check-budgets.ts", import.meta.url), path.join(directory, "check-budgets.ts"));
  cpSync(new URL("./scenarios.ts", import.meta.url), path.join(directory, "scenarios.ts"));
  const resultsDirectory = path.join(directory, "results");
  mkdirSync(resultsDirectory);
  writeFileSync(
    path.join(resultsDirectory, "browser.json"),
    JSON.stringify({
      measuresUpdate: true,
      measuresSync: true,
      results: [
        {
          lib: "ggsvelte-svg",
          caseId: "line-3x1k",
          ok: true,
          mountMedianMs: 5,
          mountSyncMedianMs: 2,
          updateMedianMs: ggsvelte.total,
          updateSyncMedianMs: ggsvelte.sync,
        },
        {
          lib: "layercake",
          caseId: "line-3x1k",
          ok: true,
          mountMedianMs: 5,
          mountSyncMedianMs: 2,
          updateMedianMs: peer.total,
          updateSyncMedianMs: peer.sync,
        },
      ],
    }),
  );
  writeFileSync(
    path.join(directory, "budgets.json"),
    JSON.stringify({
      budgets: {
        "ggsvelte-svg line-3x1k mount": { budgetMs: 20 },
        "ggsvelte-svg line-3x1k update": { budgetMs: 20 },
      },
      knownGaps: knownGap
        ? [
            {
              ggsvelte: "ggsvelte-svg",
              peer: "layercake",
              caseId: "line-3x1k",
              kind: "update",
              issue: "#1471",
            },
          ]
        : [],
    }),
  );

  return Bun.spawnSync(["bun", "run", "check-budgets.ts"], {
    cwd: directory,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("competitive browser budget gate", () => {
  test("accepts a total-time miss when synchronous timing does not corroborate it", () => {
    const result = runGate({
      ggsvelte: { total: 10, sync: 1 },
      peer: { total: 5, sync: 2 },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("PASS (sync corroboration)");
  });

  test("fails when both total and synchronous timings exceed the noise margin", () => {
    const result = runGate({
      ggsvelte: { total: 10, sync: 5 },
      peer: { total: 5, sync: 1 },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString()).toContain("FAIL");
  });

  test("keeps a known gap while results remain inside the close-ratchet margin", () => {
    const result = runGate({
      ggsvelte: { total: 5, sync: 2 },
      peer: { total: 6, sync: 2 },
      knownGap: true,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("known gap (#1471)");
  });

  test("fails a stale known gap after ggsvelte wins beyond the noise margin", () => {
    const result = runGate({
      ggsvelte: { total: 1, sync: 1 },
      peer: { total: 5, sync: 2 },
      knownGap: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("known gap CLOSED");
  });
});
