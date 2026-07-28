/**
 * Panel layout owner: placement, chrome, guides, and fixed-aspect fitting.
 *
 * Callers (finalize-layout-pass, direct tests) use `layoutPanels` and read
 * `PanelLayout.guides` rather than re-resolving axis guides. Internals stay
 * under pipeline/panel-layout*.ts; this module is the stable public seam
 * (#1076). ADR-0003 two-pass layout is unchanged.
 */
export {
  layoutPanels,
  computePanelLayout,
  type PanelLayoutInput,
} from "../pipeline/panel-layout.js";
export type {
  FacetScaleFreedom,
  PanelLayout,
  PanelLayoutResult,
  PanelPlacement,
} from "../pipeline/panel-layout-types.js";
