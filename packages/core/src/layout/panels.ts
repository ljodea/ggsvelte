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
  type PanelLayoutInput,
  type FacetScaleFreedom,
  type PanelPlacement,
} from "../pipeline/panel-layout.js";

/** Public name for the layout-owned result (#1076). */
export type { PanelLayoutResult as PanelLayout } from "../pipeline/panel-layout.js";
