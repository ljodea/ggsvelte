/**
 * Ambiguous-wiring advisories (ADR 0013 audit): prop combinations that
 * silently do nothing.
 *
 * Pure collection — assembly reads current prop snapshots into
 * {@link collectWiringDiagnostics} from a `$derived`. Delivery (once per
 * code:prop per plot instance) stays in assembly.
 */
import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  type InteractionDiagnostic,
} from "./interaction-diagnostics.js";

/** Handler prop → matching capability prop. */
const HANDLER_CAPABILITY_PAIRS = [
  ["oninspect", "inspect"],
  ["onselect", "select"],
  ["onzoom", "zoom"],
  ["onlegendfocus", "legendFocus"],
  ["onlegendfilter", "legendFilter"],
] as const;

type WiringHandlerName = (typeof HANDLER_CAPABILITY_PAIRS)[number][0];
type WiringCapabilityName = (typeof HANDLER_CAPABILITY_PAIRS)[number][1];

/**
 * Full handler/capability bags (not Partial): missing keys would silently
 * drop advisories when the pair table grows. Call sites must list every
 * entry from HANDLER_CAPABILITY_PAIRS.
 */
export type WiringDiagnosticInput = {
  readonly interactionScope: unknown;
  readonly interaction: unknown;
  /** Present handlers only need defined vs undefined; values are not inspected. */
  readonly handlers: Record<WiringHandlerName, unknown>;
  /** Capability "requested" means not undefined and not false. */
  readonly capabilities: Record<WiringCapabilityName, unknown>;
};

/**
 * Collect scope-without-controller and handler-without-capability advisories
 * from a plain snapshot. Re-run on every prop recompute so late-bound handlers
 * still advise (assembly's once-per-code:prop Set handles dedup).
 */
export function collectWiringDiagnostics(input: WiringDiagnosticInput): InteractionDiagnostic[] {
  const list: InteractionDiagnostic[] = [];
  if (input.interactionScope !== undefined && input.interaction === undefined) {
    list.push({ ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_SCOPE_WITHOUT_CONTROLLER });
  }
  for (const [handler, capability] of HANDLER_CAPABILITY_PAIRS) {
    const handlerValue = input.handlers[handler];
    if (handlerValue === undefined) continue;
    // Capability "requested" (any value but undefined/false) is enough:
    // requested-but-degraded configs already get their own diagnostics
    // (requires-key, faceted zoom, ...) — never advise twice for one
    // mistake.
    const capabilityValue = input.capabilities[capability];
    if (capabilityValue !== undefined && capabilityValue !== false) continue;
    list.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_HANDLER_WITHOUT_CAPABILITY,
      prop: handler,
      actual: capability,
    });
  }
  return list;
}
