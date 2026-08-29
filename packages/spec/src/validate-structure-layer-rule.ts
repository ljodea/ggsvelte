/**
 * Rule / hline / vline annotation vs data-driven form checks.
 * Orchestrated by validate-structure-layers.ts.
 */
import type { SpecError } from "./errors.js";
import type { Aes } from "./schema.js";
import { isRecord } from "./validate-structure-layer-shared.js";

/** Asymmetric intercept presence for rule / hline / vline form checks. */
export function hasGeomIntercepts(geom: string, layer: Record<string, unknown>): boolean {
  const params = layer["params"];
  if (!isRecord(params)) return false;
  if (geom === "hline") return params["yintercept"] !== undefined;
  if (geom === "vline") return params["xintercept"] !== undefined;
  return params["xintercept"] !== undefined || params["yintercept"] !== undefined;
}

/**
 * Structural errors for rule-family geoms. Caller returns these immediately
 * (no further layer checks apply to the rule family).
 */
export function ruleFamilyStructuralErrors(
  layer: Record<string, unknown>,
  geom: string,
  layerPath: string,
  layerAes: Aes | undefined,
  mapped: (channel: "x" | "y") => unknown,
): SpecError[] {
  const errors: SpecError[] = [];
  const intercepts = hasGeomIntercepts(geom, layer);
  // The annotation form inherits NO plot aes (normalize drops it, matching
  // ggplot2's inherit.aes = FALSE) — only the layer's OWN x/y mappings
  // conflict with intercepts. Data-driven hline/vline sugar also nulls the
  // orthogonal axis during normalize; pre-normalize validation still sees
  // raw layer aes here.
  const own = (channel: "x" | "y") => layerAes?.[channel] ?? undefined;
  let x = intercepts ? own("x") : mapped("x");
  let y = intercepts ? own("y") : mapped("y");
  // Pre-normalize data-driven aliases: orthogonal axis is not part of the form.
  if (!intercepts && geom === "hline") x = undefined;
  if (!intercepts && geom === "vline") y = undefined;
  const { interceptHint, dataHint } = ruleHints(geom);
  if (intercepts && (x !== undefined || y !== undefined)) {
    errors.push({
      code: "rule-form-ambiguous",
      path: layerPath,
      message: `This ${geom} layer mixes the annotation form (${interceptHint}) with mapped ${dataHint}. Use fixed intercepts OR a data mapping, never both.`,
      fix: {
        description:
          "Remove the intercept params (data-driven form), or unset the position aes with null (annotation form).",
        example: ruleExample(geom),
      },
    });
  } else if (!intercepts && x === undefined && y === undefined) {
    errors.push({
      code: "rule-form-missing",
      path: layerPath,
      message: `This ${geom} layer has neither fixed intercepts (${interceptHint}) nor a mapped ${dataHint} — nothing to draw.`,
      fix: {
        description: missingRuleDescription(geom),
        example: ruleExample(geom),
      },
    });
  } else if (!intercepts && x !== undefined && y !== undefined) {
    errors.push({
      code: "rule-both-axes",
      path: layerPath,
      message:
        "This rule layer maps BOTH aes.x and aes.y; a data-driven rule is either vertical (map x) or horizontal (map y). Unset the other channel with null.",
      fix: {
        description: "Keep one direction and unset the other channel with null.",
        example: { geom: "rule", aes: { y: null } },
      },
    });
  }
  return errors;
}

function ruleHints(geom: string): { interceptHint: string; dataHint: string } {
  if (geom === "hline") return { interceptHint: "params.yintercept", dataHint: "aes.y" };
  if (geom === "vline") return { interceptHint: "params.xintercept", dataHint: "aes.x" };
  return { interceptHint: "params.xintercept/yintercept", dataHint: "aes.x/aes.y" };
}

function ruleExample(geom: string) {
  if (geom === "vline") return { geom: "vline", params: { xintercept: 0 } };
  return { geom: geom === "hline" ? "hline" : "rule", params: { yintercept: 0 } };
}

function missingRuleDescription(geom: string): string {
  if (geom === "hline") {
    return "Set params.yintercept for an annotation, or map aes.y for data-driven rules.";
  }
  if (geom === "vline") {
    return "Set params.xintercept for an annotation, or map aes.x for data-driven rules.";
  }
  return "Set params.yintercept (or xintercept) for an annotation, or map aes.x/aes.y to a field for data-driven rules.";
}
