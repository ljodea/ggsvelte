/**
 * Shared harness for browser-lane GGPlot-mount diagnostic tests
 * (interaction + composition suites). Lives in tests/helpers/ so multiple
 * feature folders can import it without crossing feature-to-feature paths.
 *
 * Why browser lane only: every advisory delivery path in plot-engine.svelte.ts
 * (deliverAdvisoriesOnce, the config-diagnostics effect) runs inside $effect,
 * which svelte/server render() never executes. Assertions on ondiagnostic
 * payloads placed in *.ssr.test.ts would be vacuous passes — keep them in
 * browser-lane suites that import this helper.
 */
import { expect } from "vitest";

import type { PlotDiagnostic } from "../../src/lib/diagnostics/deprecation.js";

export function collect(): {
  diagnostics: PlotDiagnostic[];
  ondiagnostic: (diagnostic: PlotDiagnostic) => void;
} {
  const diagnostics: PlotDiagnostic[] = [];
  return {
    diagnostics,
    ondiagnostic: (diagnostic) => {
      diagnostics.push(diagnostic);
    },
  };
}

export async function settled(container: Element): Promise<void> {
  await expect.poll(() => container.querySelector("svg") !== null).toBe(true);
  // One extra macrotask drain so pending $effect flushes cannot race the
  // absence assertions below.
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
