import axe, { type AxeResults, type RunOptions, type Result } from "axe-core";

type ViolationLike = Pick<Result, "help" | "helpUrl" | "id" | "impact" | "nodes">;

export function formatAxeViolations(violations: readonly ViolationLike[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map(
          (node) =>
            `  - ${node.target.join(" ")}${node.failureSummary !== undefined && node.failureSummary !== null && node.failureSummary !== "" ? `: ${node.failureSummary}` : ""}`,
        )
        .join("\n");
      return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}\n${nodes}\n  ${violation.helpUrl}`;
    })
    .join("\n\n");
}

export function assertNoAccessibilityViolations(
  result: Pick<AxeResults, "violations">,
): asserts result is AxeResults & { violations: [] } {
  if (result.violations.length > 0) {
    throw new Error(`Accessibility violations:\n\n${formatAxeViolations(result.violations)}`);
  }
}

/**
 * Run axe against the rendered chart surface. The default rule set is WCAG
 * 2.1 A/AA; individual tests may narrow it only when exercising a partial
 * fixture that deliberately omits page-level landmarks.
 */
function auditAccessibility(
  root: Element | Document = document,
  options: RunOptions = {},
): Promise<AxeResults> {
  return axe.run(root, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    resultTypes: ["violations", "incomplete"],
    ...options,
  });
}

export async function expectAccessible(
  root: Element | Document = document,
  options: RunOptions = {},
): Promise<AxeResults> {
  const result = await auditAccessibility(root, options);
  assertNoAccessibilityViolations(result);
  return result;
}
