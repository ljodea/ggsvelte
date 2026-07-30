/**
 * Resolve host inspect capability from the GGPlot prop and registered
 * capability children (declaration-only `<Inspect>`). Pure — no registry I/O.
 *
 * Child presence enables inspect; empty child bag ≡ `inspect={true}`.
 * When any child is registered, the last child's options replace the prop
 * whole (no deep-merge). Multiple children set `multiChild` for diagnostics.
 */
import type { InspectInput, InspectOptions } from "./interaction.js";
import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  type InteractionDiagnostic,
} from "./interaction-diagnostics.js";

/** Options bag registered by one `<Inspect>` (empty object = defaults). */
export type InspectCapabilityChild = InspectOptions;

export type ResolveInspectCapabilityInput = {
  readonly prop?: InspectInput | undefined;
  readonly children?: readonly InspectCapabilityChild[] | undefined;
};

export type ResolveInspectCapabilityResult = {
  /** Value for normalizeInteractionConfig / resolveCapabilities override. */
  readonly input: InspectInput;
  /** True when more than one inspect capability child is registered. */
  readonly multiChild: boolean;
};

function childToInput(child: InspectCapabilityChild): InspectInput {
  return Object.keys(child).length === 0 ? true : child;
}

/**
 * Prefer the last capability child over the prop. No children → prop ?? false.
 */
export function resolveInspectCapability(
  input: ResolveInspectCapabilityInput,
): ResolveInspectCapabilityResult {
  const children = input.children ?? [];
  if (children.length === 0) {
    return {
      input: input.prop ?? false,
      multiChild: false,
    };
  }
  const last = children.at(-1)!;
  return {
    input: childToInput(last),
    multiChild: children.length > 1,
  };
}

/** Zero or one multi-Inspect advisory from a resolve result. */
export function duplicateInspectCapabilityDiagnostics(
  multiChild: boolean,
): InteractionDiagnostic[] {
  if (!multiChild) return [];
  return [{ ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_DUPLICATE_INSPECT_CAPABILITY }];
}
