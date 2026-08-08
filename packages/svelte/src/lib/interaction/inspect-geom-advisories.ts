/**
 * Inspect-mode × geom advisories — re-export pure collectors from @ggsvelte/core
 * so host plot-engine and the headless CLI share one implementation (#1531).
 *
 * Catalog messages for these codes also live in core
 * (`INSPECT_GEOM_DIAGNOSTIC_CATALOG`); INTERACTION_DIAGNOSTIC_CATALOG spreads them.
 */
export {
  collectInspectIntentDiagnostics,
  discreteColorFillDomainSizes,
  HIGH_CARDINALITY_DISCRETE_THRESHOLD,
  INSPECT_GEOM_DIAGNOSTIC_CATALOG,
  INSPECT_INTENT_MODES,
  inspectAxisOnBarColDiagnostics,
  inspectHighCardinalityDiagnostics,
  isInspectIntentMode,
  layerGeomsFromSpecLayers,
} from "@ggsvelte/core";
export type {
  InspectGeomAdvisory,
  InspectGeomAdvisoryCode,
  InspectIntentMode,
} from "@ggsvelte/core";
