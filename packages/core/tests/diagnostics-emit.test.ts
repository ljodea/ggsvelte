/**
 * Canonical diagnostics emission (#628): lean warning/advisory and rich
 * scaleDiagnostics share one structured facts object at emission time. Evidence
 * is never recovered by parsing human-readable messages.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DIAGNOSTIC_EVIDENCE_VALUE_LIMIT,
  boundEvidenceValues,
  dedupeScaleDiagnostics,
  emitScaleBaselineTransformedOrigin,
  emitScaleBreakOutsideDomain,
  scaleDiagnosticIdentity,
} from "../src/pipeline/diagnostics-emit.ts";

describe("boundEvidenceValues", () => {
  it("caps evidence at the central limit", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(boundEvidenceValues(values)).toEqual(values.slice(0, DIAGNOSTIC_EVIDENCE_VALUE_LIMIT));
    expect(DIAGNOSTIC_EVIDENCE_VALUE_LIMIT).toBeGreaterThan(0);
  });
});

describe("emitScaleBreakOutsideDomain", () => {
  it("builds lean + rich from structured facts without reading the message", () => {
    const { warning, diagnostic } = emitScaleBreakOutsideDomain("x", [1000, 2000], 1, 9);

    expect(warning.code).toBe("scale-break-outside-domain");
    expect(warning.message).toContain("1000");
    expect(diagnostic.code).toBe("scale-break-outside-domain");
    expect(diagnostic.severity).toBe("warning");
    expect(diagnostic.path).toBe("/scales/x/breaks");
    expect(diagnostic.evidence?.values).toEqual([1000, 2000]);
    expect(diagnostic.evidence?.failedCount).toBe(2);
    expect(diagnostic.documentationUrl).toContain("scale-break-outside-domain");
    // Presentation text is derived; evidence is independent of message wording.
    expect(diagnostic.evidence?.values).not.toEqual(
      warning.message.match(/-?\d+(?:\.\d+)?/g)?.map(Number),
    );
  });

  it("bounds evidence values via the central limit", () => {
    const outside = Array.from({ length: DIAGNOSTIC_EVIDENCE_VALUE_LIMIT + 3 }, (_, i) => 100 + i);
    const { diagnostic } = emitScaleBreakOutsideDomain("y", outside, 0, 1);
    expect(diagnostic.evidence?.failedCount).toBe(outside.length);
    expect(diagnostic.evidence?.values).toEqual(outside.slice(0, DIAGNOSTIC_EVIDENCE_VALUE_LIMIT));
  });
});

describe("emitScaleBaselineTransformedOrigin", () => {
  it("builds lean advisory + rich diagnostic from axis fact alone", () => {
    const { advisory, diagnostic } = emitScaleBaselineTransformedOrigin("y");

    expect(advisory.code).toBe("scale-baseline-transformed-origin");
    expect(advisory.path).toBe("scales.y");
    expect(diagnostic.code).toBe("scale-baseline-transformed-origin");
    expect(diagnostic.severity).toBe("advisory");
    expect(diagnostic.path).toBe("/scales/y");
    expect(diagnostic.problem.length).toBeGreaterThan(0);
    expect(diagnostic.cause.length).toBeGreaterThan(0);
    expect(diagnostic.fixes.length).toBeGreaterThan(0);
    expect(diagnostic.documentationUrl).toContain("scale-baseline-transformed-origin");
  });
});

describe("dedupeScaleDiagnostics", () => {
  it("keeps first entry per code+path identity", () => {
    const a = emitScaleBreakOutsideDomain("x", [1000], 1, 9).diagnostic;
    const b = emitScaleBreakOutsideDomain("x", [2000], 1, 9).diagnostic;
    const c = emitScaleBreakOutsideDomain("y", [1000], 1, 9).diagnostic;
    const out = dedupeScaleDiagnostics([a, b, c]);
    expect(out).toHaveLength(2);
    expect(out[0]!.evidence?.values).toEqual([1000]);
    expect(out[1]!.path).toBe("/scales/y/breaks");
  });

  it("identity is owned centrally", () => {
    const d = emitScaleBreakOutsideDomain("x", [1], 0, 1).diagnostic;
    expect(scaleDiagnosticIdentity(d)).toBe("scale-break-outside-domain\0/scales/x/breaks");
  });
});

describe("no message-text recovery for scale-training rich evidence", () => {
  it("training emitters use structured dual-channel factories (no message parse)", () => {
    const src = join(import.meta.dir, "..", "src", "pipeline");
    const continuous = readFileSync(join(src, "scale-axis-train-continuous.ts"), "utf8");
    expect(continuous).toContain("emitScaleBreakOutsideDomain");
    expect(continuous).not.toMatch(/parseBreakOutside|warning\.message\.match/);
    const zero = readFileSync(join(src, "scale-axis-train-continuous-zero.ts"), "utf8");
    expect(zero).toContain("emitScaleBaselineTransformedOrigin");
    const emit = readFileSync(join(src, "diagnostics-emit.ts"), "utf8");
    expect(emit).not.toMatch(/warning\.message|message\.match|parseBreakOutside/);
  });
});
