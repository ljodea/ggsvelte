/**
 * Resolve host inspect capability from the GGPlot prop and registered
 * capability children (declaration-only `<Inspect>`). Pure — no registry I/O.
 *
 * Child presence enables inspect; empty child bag ≡ `inspect={true}`.
 * When any child is registered, the last child's options replace the prop
 * whole (no deep-merge). Multiple children set `multiChild` for diagnostics.
 */
import type { DatumKey } from "../runtime/resolve-datum-key.js";
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
  /** Row identity the winning source asks for; undefined means "use the default". */
  readonly identity: DatumKey | undefined;
  /** True when the prop named an identity that the winning child replaced away. */
  readonly droppedPropIdentity: boolean;
};

function childToInput(child: InspectCapabilityChild): InspectInput {
  return Object.keys(child).length === 0 ? true : child;
}

/** Read `identity` off an inspect input; boolean forms carry none. */
function identityOf(input: InspectInput | undefined): DatumKey | undefined {
  if (input === undefined || input === true || input === false) return undefined;
  return input.identity;
}

/**
 * Prefer the last capability child over the prop. No children → prop ?? false.
 *
 * Resolving `identity` here (rather than leaving callers to re-read it off
 * `input`) is what makes the REPLACE rule visible: an `<Inspect>` child that
 * names no identity drops one the prop asked for, and `droppedPropIdentity`
 * says so instead of the identity vanishing into a row-index default.
 */
export function resolveInspectCapability(
  input: ResolveInspectCapabilityInput,
): ResolveInspectCapabilityResult {
  const children = input.children ?? [];
  if (children.length === 0) {
    return {
      input: input.prop ?? false,
      multiChild: false,
      identity: identityOf(input.prop),
      droppedPropIdentity: false,
    };
  }
  const last = children.at(-1)!;
  const resolved = childToInput(last);
  const identity = identityOf(resolved);
  return {
    input: resolved,
    multiChild: children.length > 1,
    identity,
    droppedPropIdentity: identity === undefined && identityOf(input.prop) !== undefined,
  };
}

/** Zero or one multi-Inspect advisory from a resolve result. */
export function duplicateInspectCapabilityDiagnostics(
  multiChild: boolean,
): InteractionDiagnostic[] {
  if (!multiChild) return [];
  return [{ ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_DUPLICATE_INSPECT_CAPABILITY }];
}

/** Zero or one advisory for a prop identity a child replaced away. */
export function droppedInspectIdentityDiagnostics(
  droppedPropIdentity: boolean,
): InteractionDiagnostic[] {
  if (!droppedPropIdentity) return [];
  return [{ ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_IDENTITY_DROPPED }];
}
