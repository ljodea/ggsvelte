/**
 * Pure helpers for PlaygroundOutput tab/copy UI decisions.
 * Keeps Svelte components free of $effect-driven state resets.
 */

/** Clamp a selected tab index when the outputs list shrinks. */
export function clampOutputTabIndex(active: number, count: number): number {
  if (count <= 0) return 0;
  return active >= count ? 0 : active;
}

/**
 * Whether a copy session still applies to the current outputs identity.
 * When the outputs reference changes, stale copy UI must not surface.
 */
export function copySessionMatchesOutputs<T>(sessionOutputs: T | null, currentOutputs: T): boolean {
  return sessionOutputs !== null && sessionOutputs === currentOutputs;
}

export function playgroundDiagnosticSignature(
  diagnostics: readonly {
    readonly source: string;
    readonly code: string;
    readonly path: string;
  }[],
): string {
  return diagnostics.map((item) => `${item.source}:${item.code}:${item.path}`).join("|");
}

/** True when focus should move to the diagnostics alert for a new signature. */
export function shouldFocusDiagnosticsAlert(signature: string, previouslyFocused: string): boolean {
  return signature !== "" && signature !== previouslyFocused;
}
