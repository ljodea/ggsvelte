/**
 * vr-gate job driver (issue #742) — the required-check aggregator for
 * vr-compare.yml's pixel job.
 *
 * Why this exists: `vr-compare.yml` is deliberately a SEPARATE, unprivileged
 * workflow (trust separation — see its header), so ci.yml's `ci-gate` cannot
 * list it in `needs`. That left the only job that actually measures pixels
 * outside the required set, so a PR could change an example's rendering, go
 * red on the compare, and merge anyway (#732). Every later PR then inherited
 * a failure it did not cause.
 *
 * A separate workflow can still be a REQUIRED STATUS CHECK, which is what
 * this job is for: one stable context per PR whose verdict is derived here
 * rather than in YAML.
 */

export type VrGateInput = {
  /** Raw `needs.detect-changes.result`. */
  detectChangesResult: string | undefined;
  /** `needs.detect-changes.outputs.vr == 'true'`. */
  vrRouted: boolean;
  /** Raw `needs.compare.result`. */
  compareResult: string | undefined;
};

export type VrGateVerdict = { ok: boolean; reason: string };

export function evaluateVrGate(input: VrGateInput): VrGateVerdict {
  if (input.detectChangesResult !== "success") {
    return {
      ok: false,
      reason: `detect-changes is ${describe(input.detectChangesResult)} — routing cannot be trusted`,
    };
  }
  if (input.vrRouted) {
    if (input.compareResult !== "success") {
      return { ok: false, reason: `vr routed but compare is ${describe(input.compareResult)}` };
    }
    return { ok: true, reason: "pixel compare succeeded for this head" };
  }
  return { ok: true, reason: "vr not routed for these paths — no pixel contract to check" };
}

function describe(result: string | undefined): string {
  return result === undefined || result === "" ? "absent" : result;
}
