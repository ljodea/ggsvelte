/**
 * Lazy identity index for candidate store construction.
 */
import {
  buildCandidateIdentityIndex,
  type CandidateIdentityIndex,
} from "./build-candidates-identity.js";
import type { FacetPanelDef } from "./facets.js";
import type { LayerFrame } from "./types.js";

export function createLazyIdentityIndex(
  panelFrames: readonly (readonly LayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): () => CandidateIdentityIndex {
  let identityIndex: CandidateIdentityIndex | null = null;
  return () => {
    if (identityIndex !== null) return identityIndex;
    identityIndex = buildCandidateIdentityIndex(panelFrames, facetPanels);
    return identityIndex;
  };
}
