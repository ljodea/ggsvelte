/**
 * Every runner-backed job must declare `timeout-minutes`.
 *
 * GitHub's default job timeout is 360 minutes. A job whose runner wedges before
 * it reports a single step therefore sits `in_progress` for six hours, and any
 * aggregator that `needs:` it — `ci-gate` — stays pending for the same six
 * hours, blocking the PR with no signal and no log to read. That happened on
 * #747: `svelte-check` normally finishes in ~80s, and one instance held the
 * gate for 40+ minutes having emitted no steps at all, on a run whose fifteen
 * sibling jobs were all green inside nine minutes.
 *
 * Nothing can tell a wedged runner from a genuinely slow job, so the fix is a
 * declared ceiling per job: a hang becomes a fast, legible failure that can be
 * re-run, instead of an indefinite stall.
 *
 * A job that calls a reusable workflow (`uses:`) CANNOT carry the key —
 * actionlint rejects it ("when a reusable workflow is called with 'uses',
 * 'timeout-minutes' is not available") — so the ceiling belongs on the
 * `runs-on` job inside the called workflow, which is where the runner actually
 * lives. That asymmetry is asserted below so it stays understood rather than
 * rediscovered.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const WORKFLOWS = join(ROOT, ".github", "workflows");

interface Job {
  "runs-on"?: unknown;
  uses?: unknown;
  "timeout-minutes"?: unknown;
}

interface Workflow {
  jobs?: Record<string, Job>;
}

/**
 * Upper bound on any declared ceiling. The slowest job in the repo is the
 * manual NVDA/TalkBack assistive-tech run at 45 minutes; nothing routine comes
 * close (the slowest CI job, component-journeys, is ~7 minutes). A ceiling
 * above this is indistinguishable from having none.
 */
const MAX_TIMEOUT_MINUTES = 60;

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .toSorted();
}

function parseWorkflow(name: string): Workflow {
  return Bun.YAML.parse(readFileSync(join(WORKFLOWS, name), "utf8")) as Workflow;
}

describe("workflow job timeouts", () => {
  const files = workflowFiles();

  it("finds the workflow directory", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const jobs = Object.entries(parseWorkflow(file).jobs ?? {});

    for (const [id, job] of jobs) {
      const isReusableCall = job.uses !== undefined;
      const declared = job["timeout-minutes"];

      if (isReusableCall) {
        it(`${file} · ${id} (reusable caller) leaves the timeout to the called workflow`, () => {
          expect(declared, `${file} · ${id}`).toBeUndefined();
        });
        continue;
      }

      it(`${file} · ${id} declares a timeout at or under ${String(MAX_TIMEOUT_MINUTES)}m`, () => {
        expect(declared, `${file} · ${id}: runner-backed job without timeout-minutes`).toBeNumber();
        expect(declared as number, `${file} · ${id}`).toBeGreaterThan(0);
        expect(declared as number, `${file} · ${id}`).toBeLessThanOrEqual(MAX_TIMEOUT_MINUTES);
      });
    }
  }
});
