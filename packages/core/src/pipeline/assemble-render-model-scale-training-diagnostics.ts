/**
 * Rich `RenderModel.scaleDiagnostics` materialization for the two scale-TRAINING
 * events that are emitted lean during affine training (baseline transformed
 * origin, break-outside-domain). Synthesized here from the already-deduplicated
 * lean warning/advisory channels so agents/tooling get problem/cause/fixes/docs
 * without threading a diagnostics collector through the whole training pass.
 */
import type { Advisory, PipelineWarning } from "./types.js";
import type { ScaleDiagnostic } from "./types-scale-diagnostics.js";

const DOCS = "https://ljodea.github.io/ggsvelte/guide/errors";

/** `scales.x` / `scales.y` → axis; unknown paths are skipped. */
function axisOfPath(path: string): "x" | "y" | null {
  if (path.endsWith(".x") || path.endsWith("/x")) return "x";
  if (path.endsWith(".y") || path.endsWith("/y")) return "y";
  return null;
}

/** Parse the break-outside-domain warning message for its axis and dropped values. */
function parseBreakOutside(message: string): { axis: "x" | "y"; values: number[] } | null {
  const axisMatch = /explicit ([xy]) break/.exec(message);
  if (axisMatch === null) return null;
  const tail = message.slice(message.lastIndexOf(":") + 1);
  const values = tail
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
  return { axis: axisMatch[1] as "x" | "y", values };
}

/**
 * Build rich diagnostics from the deduped lean channels. One entry per surviving
 * `scale-baseline-transformed-origin` advisory and `scale-break-outside-domain`
 * warning (dedup already applied upstream, so this preserves the once-per-axis
 * contract).
 */
export function scaleTrainingDiagnostics(
  warnings: readonly PipelineWarning[],
  advisories: readonly Advisory[],
): ScaleDiagnostic[] {
  const out: ScaleDiagnostic[] = [];

  for (const advisory of advisories) {
    if (advisory.code !== "scale-baseline-transformed-origin") continue;
    const axis = axisOfPath(advisory.path);
    if (axis === null) continue;
    out.push({
      code: "scale-baseline-transformed-origin",
      severity: "advisory",
      path: `/scales/${axis}`,
      problem: `Zero-baseline geoms on the ${axis} scale measure from the transformed-space origin 0 (semantic 1), not from zero.`,
      cause:
        "log10 has no image for semantic zero, so bar/col/area/histogram/density baselines and stack/dodge offsets are anchored at the transformed origin instead.",
      fixes: [
        {
          description:
            "This baseline is not configurable for log10; use an identity or sqrt transform if a semantic-zero baseline is required.",
        },
      ],
      documentationUrl: `${DOCS}#scale-baseline-transformed-origin`,
    });
  }

  for (const warning of warnings) {
    if (warning.code !== "scale-break-outside-domain") continue;
    const parsed = parseBreakOutside(warning.message);
    if (parsed === null) continue;
    out.push({
      code: "scale-break-outside-domain",
      severity: "warning",
      path: `/scales/${parsed.axis}/breaks`,
      problem: `One or more explicit ${parsed.axis} breaks are outside the trained display domain and were omitted.`,
      cause:
        "Breaks beyond the expanded display domain cannot be projected onto the axis and are dropped by the tick filter.",
      fixes: [
        {
          description: "Remove the out-of-domain breaks or widen the explicit domain.",
        },
      ],
      evidence: {
        failedCount: parsed.values.length,
        values: parsed.values,
      },
      documentationUrl: `${DOCS}#scale-break-outside-domain`,
    });
  }

  return out;
}
