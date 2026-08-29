/**
 * Post-geom-spec refinement for the mock responder: rule annotation add-ons
 * (geom_hline / geom_vline sugar #818), facets, coord / scale overrides, and
 * legend guides. Mutates ctx.spec / ctx.scales in place, in original order.
 */
import type { MockContext } from "./types.ts";

export function postprocess(ctx: MockContext): void {
  addRuleAnnotation(ctx);
  applyFacets(ctx);
  applyCoordinatesAndScales(ctx);
  applyLegend(ctx);
}

function addRuleAnnotation(ctx: MockContext): void {
  const { prompt, spec } = ctx;

  // --- rule annotation add-on (geom_hline / geom_vline sugar #818) ---------
  // Prefer explicit intercepts: "y = 10", "x = 2.5", or "at N" after
  // threshold/hline/vline/vertical/horizontal phrasing.
  const hlineMatch =
    /\bhline\b/.test(prompt) || /horizontal (?:reference )?line/.test(prompt)
      ? (/y\s*=\s*(-?\d+(?:\.\d+)?)/.exec(prompt) ??
        /(?:threshold|limit|target|reference line|average)[^.]*?\bat (-?\d+(?:\.\d+)?)/.exec(
          prompt,
        ))
      : null;
  const vlineMatch =
    /\bvline\b/.test(prompt) || /vertical (?:reference |cutoff )?line/.test(prompt)
      ? (/x\s*=\s*(-?\d+(?:\.\d+)?)/.exec(prompt) ??
        /(?:cutoff|threshold|limit|target|reference line)[^.]*?\bat (-?\d+(?:\.\d+)?)/.exec(prompt))
      : null;
  const legacyRuleMatch =
    hlineMatch === null && vlineMatch === null
      ? /(?:threshold|limit|target|reference line|average)[^.]*?\bat (-?\d+(?:\.\d+)?)/.exec(prompt)
      : null;
  if (hlineMatch !== null) {
    spec.layers.push({
      geom: "rule",
      params: { yintercept: Number(hlineMatch[1]) },
    });
  } else if (vlineMatch !== null) {
    spec.layers.push({
      geom: "rule",
      params: { xintercept: Number(vlineMatch[1]) },
    });
  } else if (legacyRuleMatch !== null) {
    const value = Number(legacyRuleMatch[1]);
    const vertical = prompt.includes("vertical");
    spec.layers.push({
      geom: "rule",
      params: vertical ? { xintercept: value } : { yintercept: value },
    });
  }
}

function applyFacets(ctx: MockContext): void {
  const { prompt, pick, spec } = ctx;

  if (prompt.includes("grid") && prompt.includes("rows")) {
    const rows = pick.mentionedCat();
    const cols = pick.mentionedCat();
    if (rows !== undefined && cols !== undefined) {
      spec.facet = { rows: { field: rows }, cols: { field: cols } };
    }
  } else if (/panel|facet|small multiple/.test(prompt)) {
    const wrap = pick.mentionedCat();
    if (wrap !== undefined) {
      const facet: Record<string, unknown> = { wrap: { field: wrap } };
      const ncol = /(\d+) columns/.exec(prompt);
      if (ncol !== null) facet["ncol"] = Number(ncol[1]);
      if (/independent y|free y|own y/.test(prompt)) facet["scales"] = "free_y";
      spec.facet = facet;
    }
  }
}

function applyCoordinatesAndScales(ctx: MockContext): void {
  const { prompt, spec, scales } = ctx;

  // --- coord / scales ---------------------------------------------------------
  const hasHorizontalRibbon = spec.layers.some(
    (layer) => layer.geom === "ribbon" && layer.aes?.["xmin"] !== undefined,
  );
  if (prompt.includes("horizontal") && !hasHorizontalRibbon) spec.coord = { type: "flip" };
  if (/fixed[- ]aspect|equal physical lengths|not stretched/.test(prompt)) {
    spec.coord = { type: "fixed" };
  }
  const postStatCoordinate =
    /post-stat coordinate|coordinate transform/.test(prompt) &&
    /\blog(?:10|arithmic)?\b/.test(prompt);
  if (postStatCoordinate) {
    const onX =
      /(?:coordinate|log(?:10|arithmic)?)[^.]*\bx[- ]axis|\bx[- ]axis[^.]*coordinate/.test(prompt);
    spec.coord = {
      type: "transform",
      [onX ? "x" : "y"]: { transform: "log10" },
    };
  } else if (/\blog\b|logarithmic/.test(prompt)) {
    const onX = /log(?:arithmic)?[^.]*\bx[- ]axis|\bx[- ]axis[^.]*log/.test(prompt);
    scales[onX ? "x" : "y"] = { type: "log" };
  }
  if (/automatic temporal inference|rely on (?:automatic )?inference/.test(prompt)) {
    delete scales["x"];
  }
  if (/identifier|model code/.test(prompt)) scales["x"] = { type: "band" };
  if (/binned colou?r|colou?rsteps/.test(prompt)) {
    const boundaryText = /boundaries\s+(.+?)(?:\s+so\b|\.|$)/.exec(prompt)?.[1] ?? "";
    const breaks = [...boundaryText.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    const channel = scales["color"] === undefined ? "fill" : "color";
    scales[channel] = {
      type: "binned",
      ...(breaks.length >= 2 && { breaks }),
    };
  }
  const ordered = /\b(dmy|mdy|ymd|ydm|myd|dym)\b/.exec(prompt)?.[1];
  if (ordered !== undefined) scales["x"] = { type: "time", parse: ordered };
  if (Object.keys(scales).length > 0) spec.scales = scales;
}

function applyLegend(ctx: MockContext): void {
  const { prompt, spec } = ctx;

  if (/legend[^.]*\b(?:below|bottom)\b|\b(?:below|bottom)[^.]*legend/.test(prompt)) {
    const aesthetic = spec.layers.some((layer) => layer.aes?.["color"] !== undefined)
      ? "color"
      : "fill";
    spec.guides = {
      [aesthetic]: {
        type: "legend",
        position: "bottom",
        ...(prompt.includes("horizontal") && { direction: "horizontal" }),
      },
    };
  }
}
