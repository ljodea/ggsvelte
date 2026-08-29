import type { EvalCase } from "./types.ts";

function addLayerCoverage(
  evalCase: EvalCase,
  stats: Set<string>,
  positions: Set<string>,
  facts: Set<string>,
): void {
  if (evalCase.gold === null) return;
  for (const layer of evalCase.gold.layers as Array<{
    stat?: string;
    position?: string;
    params?: { method?: string };
  }>) {
    if (layer.stat !== undefined) stats.add(layer.stat);
    if (layer.position !== undefined) positions.add(layer.position);
    if (layer.params?.method !== undefined) facts.add(`smooth:${layer.params.method}`);
  }
}

function addSpecCoverage(evalCase: EvalCase, facts: Set<string>): void {
  if (evalCase.gold === null) return;
  const gold = evalCase.gold as unknown as Record<string, unknown>;
  const facet = gold["facet"] as Record<string, unknown> | undefined;
  if (facet?.["wrap"] !== undefined) facts.add("facet:wrap");
  if (facet?.["rows"] !== undefined || facet?.["cols"] !== undefined) facts.add("facet:grid");
  if (facet?.["scales"] !== undefined && facet["scales"] !== "fixed") facts.add("facet:free");
  const coord = gold["coord"] as Record<string, unknown> | undefined;
  if (coord?.["type"] === "flip") facts.add("coord:flip");
  addScaleCoverage(gold["scales"], facts);
}

function addScaleCoverage(scalesValue: unknown, facts: Set<string>): void {
  const scales = scalesValue as Record<string, { type?: string; transform?: string }> | undefined;
  for (const channel of ["x", "y", "color", "fill"]) {
    const kind = channel === "color" || channel === "fill" ? "colorish" : "pos";
    const type = scales?.[channel]?.type;
    if (type !== undefined) facts.add(`scale:${kind}:${type}`);
    const transform = scales?.[channel]?.transform;
    if (transform !== undefined && transform !== "identity") {
      facts.add(`scale:${kind}:${transform}`);
    }
  }
}

export function collectCoverage(cases: EvalCase[]): {
  stats: Set<string>;
  positions: Set<string>;
  facts: Set<string>;
} {
  const stats = new Set<string>();
  const positions = new Set<string>();
  const facts = new Set<string>();
  for (const evalCase of cases) {
    addLayerCoverage(evalCase, stats, positions, facts);
    addSpecCoverage(evalCase, facts);
  }
  return { stats, positions, facts };
}
