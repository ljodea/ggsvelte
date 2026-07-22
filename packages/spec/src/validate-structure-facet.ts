/**
 * Data-free structural checks for facet wrap XOR grid form.
 * Layer grammar: validate-structure-layers.ts. Color schemes: validate-structure-scales.ts.
 */
import type { SpecError } from "./errors.js";

export function facetStructuralErrors(facet: Record<string, unknown>): SpecError[] {
  const errors: SpecError[] = [];
  const hasWrap = facet["wrap"] !== undefined;
  const hasGrid = facet["rows"] !== undefined || facet["cols"] !== undefined;
  if (hasWrap && hasGrid) {
    errors.push({
      code: "facet-form-ambiguous",
      path: "/facet",
      message:
        "This facet mixes the wrap form (facet.wrap) with the grid form (facet.rows/facet.cols). Use wrap OR rows/cols, never both.",
      fix: {
        description: "Keep facet.wrap (and drop rows/cols), or keep rows/cols (and drop wrap).",
        example: { wrap: { field: "group" }, ncol: 3 },
      },
    });
  } else if (!hasWrap && !hasGrid) {
    errors.push({
      code: "facet-form-missing",
      path: "/facet",
      message:
        "This facet sets neither wrap nor rows/cols — there is no field to partition panels by.",
      fix: {
        description: "Set facet.wrap (wrap form) or facet.rows/facet.cols (grid form).",
        example: { wrap: { field: "group" } },
      },
    });
  }
  if (facet["ncol"] !== undefined && !hasWrap) {
    errors.push({
      code: "facet-ncol-without-wrap",
      path: "/facet/ncol",
      message:
        "facet.ncol only applies to the wrap form; the grid form's columns come from facet.cols' distinct values.",
      fix: { description: "Remove ncol, or switch to the wrap form." },
    });
  }
  return errors;
}
