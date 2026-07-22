/**
 * Data-free structural checks for facet wrap XOR grid form.
 * Layer grammar: validate-structure-layers.ts. Color schemes: validate-structure-scales.ts.
 */
import type { SpecError } from "./errors.js";

export function coordFacetStructuralErrors(input: Record<string, unknown>): SpecError[] {
  const coord = input["coord"];
  const facet = input["facet"];
  if (
    typeof coord !== "object" ||
    coord === null ||
    Array.isArray(coord) ||
    (coord as Record<string, unknown>)["type"] !== "fixed" ||
    typeof facet !== "object" ||
    facet === null ||
    Array.isArray(facet)
  ) {
    return [];
  }
  const scales = (facet as Record<string, unknown>)["scales"];
  if (scales === undefined || scales === "fixed") return [];
  return [
    {
      code: "coord-fixed-free-scales",
      path: "/facet/scales",
      message: `coord_fixed cannot use facet scales ${JSON.stringify(scales)} because panels would imply unequal physical data-unit lengths.`,
      fix: {
        description: 'Use facet.scales = "fixed", or remove the fixed-aspect coordinate.',
        example: "fixed",
      },
    },
  ];
}

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
