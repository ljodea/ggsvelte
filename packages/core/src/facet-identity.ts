import { encodeKey } from "./scales/state.js";

/** The facet declaration slot that contributes a value to a panel. */
export type FacetPanelRole = "wrap" | "rows" | "cols";

/** One typed, canonical component of a facet panel identity. */
export interface FacetPanelValueIdentity {
  readonly role: FacetPanelRole;
  readonly field: string;
  /** `encodeKey` preserves distinctions such as `"1"`/`1` and `0`/`-0`. */
  readonly encodedValue: string;
}

/**
 * Position-independent identity for a facet panel.
 *
 * `key` is versioned and length-framed, so field names and values containing
 * punctuation cannot collide. `values` keeps the structured semantic form for
 * linked interactions that must not parse display labels or opaque keys.
 */
export interface FacetPanelIdentity {
  readonly key: string;
  readonly values: readonly FacetPanelValueIdentity[];
}

export interface FacetPanelIdentityInput {
  readonly role: FacetPanelRole;
  readonly field: string;
  readonly value: unknown;
}

function frame(value: string): string {
  return `${value.length}:${value}`;
}

export function createFacetPanelIdentity(
  entries: readonly FacetPanelIdentityInput[],
): FacetPanelIdentity {
  // Preserve the long-standing single-panel id: interaction state and fixtures
  // legitimately use it even though there are no facet values to describe.
  if (entries.length === 0) return Object.freeze({ key: "panel:all", values: Object.freeze([]) });

  const values = entries.map(({ role, field, value }) =>
    Object.freeze({ role, field, encodedValue: encodeKey(value) }),
  );
  const payload = values
    .map(({ role, field, encodedValue }) => frame(role) + frame(field) + frame(encodedValue))
    .join("");
  return Object.freeze({
    key: `panel:facet:v1:${values.length}:${payload}`,
    values: Object.freeze(values),
  });
}
