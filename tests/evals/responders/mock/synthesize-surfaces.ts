/**
 * Surface/isoline geom families for the mock responder: the sf family,
 * density 2D (filled), ellipse, dotplot, density 2D, and contour.
 * Handlers return their layers in original match order; the orchestrator
 * stops at the first match.
 */
import { fieldNamed } from "./profile.ts";
import { f } from "./style.ts";
import type { MockAes, MockContext, MockLayer } from "./types.ts";

export function synthesizeSurfaces(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick, scales } = ctx;

  // geom_sf_label: boxed labels at representative SF points (#809 phase 3).
  if (
    (/\bgeom[_\s]?sf[_\s]?label\b|\bsf_label\b|\bsf label\b|\bboxed labels?\b/.test(prompt) ||
      (fieldNamed(profile, "geometry") !== undefined &&
        /\blabel\b/.test(prompt) &&
        /\bbox(?:ed|es)?\b/.test(prompt))) &&
    (fieldNamed(profile, "geometry") !== undefined ||
      /\bgeojson\b|\bsimple features?\b/.test(prompt))
  ) {
    const aes: MockAes = {};
    const label =
      fieldNamed(profile, "name") ??
      fieldNamed(profile, "region") ??
      fieldNamed(profile, "label") ??
      pick.mentionedCat() ??
      profile.fields.find((fld) => fld.type === "nominal" && fld.name !== "geometry")?.name;
    if (label !== undefined) aes.label = f(label);
    return [{ geom: "sf_label", aes }];
  }

  // geom_sf_text: labels at representative SF points (#809 phase 2).
  if (
    (/\bgeom[_\s]?sf[_\s]?text\b|\bsf_text\b|\bsf text\b/.test(prompt) ||
      (fieldNamed(profile, "geometry") !== undefined &&
        /\blabel\b/.test(prompt) &&
        !/\bfill\b|\bchoropleth\b/.test(prompt))) &&
    (fieldNamed(profile, "geometry") !== undefined ||
      /\bgeojson\b|\bsimple features?\b/.test(prompt))
  ) {
    const aes: MockAes = {};
    const label =
      fieldNamed(profile, "name") ??
      fieldNamed(profile, "region") ??
      fieldNamed(profile, "label") ??
      pick.mentionedCat() ??
      profile.fields.find((fld) => fld.type === "nominal" && fld.name !== "geometry")?.name;
    if (label !== undefined) aes.label = f(label);
    const fill =
      fieldNamed(profile, "rate") ??
      profile.fields.find((fld) => fld.type === "quantitative" && fld.name !== "geometry")?.name;
    if (fill !== undefined && /\bfill\b/.test(prompt)) aes.fill = f(fill);
    return [{ geom: "sf_text", aes }];
  }

  // geom_sf: GeoJSON Geometry JSON strings in a column (#809).
  if (
    /\bgeom[_\s]?sf\b|\bgeojson\b|\bsimple features?\b|\bsf (?:point|polygon|layer|choropleth)\b/.test(
      prompt,
    ) ||
    fieldNamed(profile, "geometry") !== undefined
  ) {
    const aes: MockAes = {};
    const fill =
      fieldNamed(profile, "rate") ??
      pick.mentionedQuant() ??
      profile.fields.find((fld) => fld.type === "quantitative" && fld.name !== "geometry")?.name;
    if (fill !== undefined) aes.fill = f(fill);
    return [{ geom: "sf", aes }];
  }

  if (
    prompt.includes("three layers") &&
    prompt.includes("smooth") &&
    prompt.includes("histogram") &&
    prompt.includes("density")
  ) {
    const x = pick.quant() ?? "x";
    const y = pick.quant() ?? "y";
    scales["x"] = { type: "linear", transform: "log10" };
    return [
      {
        geom: "smooth",
        aes: { x: f(x), y: f(y) },
        params: { method: "lm", se: false },
      },
      {
        geom: "histogram",
        aes: { x: f(x) },
        params: { binwidth: 0.5, boundary: 0 },
      },
      { geom: "density", aes: { x: f(x) } },
    ];
  }

  // geom_density_2d_filled closed KDE rings (#802 phase 2).
  if (
    /\bdensity[_ ]?2d[_ ]?filled\b|\bfilled\b.*\bdensity\b|\bdensity\b.*\bfilled\b|\bfilled bands?\b/.test(
      prompt,
    )
  ) {
    const x = fieldNamed(profile, "x") ?? pick.mentionedQuant() ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.mentionedQuant() ?? pick.quant() ?? "y";
    const layer: MockLayer = {
      geom: "density_2d_filled",
      stat: "density_2d_filled",
      aes: { x: f(x), y: f(y) },
    };
    const params: Record<string, unknown> = {};
    const binsMatch = prompt.match(/\b(\d+)\s*bins?\b/);
    if (binsMatch !== null) params["bins"] = Number(binsMatch[1]);
    const nMatch = prompt.match(/\b(\d+)\s*(?:by|×|x)\s*(\d+)\s*grid\b|\b(\d+)\s*by\s*(\d+)\b/i);
    if (nMatch !== null) {
      const n = Number(nMatch[1] ?? nMatch[3]);
      if (Number.isFinite(n)) params["n"] = n;
    }
    if (Object.keys(params).length > 0) layer.params = params;
    const layers: MockLayer[] = [];
    if (/\bscatter\b|\bpoint\b|overlay/.test(prompt)) {
      layers.push({ geom: "point", aes: { x: f(x), y: f(y) } });
    }
    layers.push(layer);
    return layers;
  }

  // stat_ellipse bivariate normal rings on path (#812).
  if (/\bellipse\b|\bconfidence (?:ellipse|ring)/.test(prompt)) {
    const x = fieldNamed(profile, "x") ?? pick.mentionedQuant() ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.mentionedQuant() ?? pick.quant() ?? "y";
    const color = pick.cat() ?? pick.mentionedCat();
    const pointAes: MockAes = { x: f(x), y: f(y) };
    if (color !== undefined) pointAes.color = f(color);
    const layers: MockLayer[] = [];
    if (/\bscatter\b|\bpoint\b|overlay/.test(prompt)) {
      layers.push({ geom: "point", aes: { ...pointAes } });
    }
    const pathAes: MockAes = { x: f(x), y: f(y) };
    if (color !== undefined) pathAes.color = f(color);
    const layer: MockLayer = {
      geom: "path",
      stat: "ellipse",
      aes: pathAes,
    };
    const levelMatch = prompt.match(/\b0\.\d+\b|\b95%\b|\b99%\b/);
    if (levelMatch !== null) {
      const raw = levelMatch[0];
      const level = raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
      if (Number.isFinite(level) && level > 0 && level < 1) layer.params = { level };
    }
    layers.push(layer);
    return layers;
  }

  // geom_dotplot / stat_bindot histodot stacks (#803).
  if (/\bdotplot\b|\bhistodot\b|\bbindot\b/.test(prompt)) {
    const x =
      fieldNamed(profile, "measurement") ??
      fieldNamed(profile, "value") ??
      fieldNamed(profile, "x") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "x";
    const layer: MockLayer = {
      geom: "dotplot",
      stat: "bindot",
      aes: { x: f(x) },
    };
    const params: Record<string, unknown> = {};
    const bw = prompt.match(/\bbinwidth\s+(\d+(?:\.\d+)?)\b/);
    if (bw !== null) params.binwidth = Number(bw[1]);
    if (/\bcenter-stacked\b|stackdir\s+center\b/.test(prompt)) params.stackdir = "center";
    if (Object.keys(params).length > 0) layer.params = params;
    return [layer];
  }

  // geom_density_2d / stat_density_2d product Gaussian isolines (#802).
  if (/\bdensity[_ ]?2d\b|\bbivariate kde\b|\bkde isolines?\b/.test(prompt)) {
    const x =
      fieldNamed(profile, "x") ??
      fieldNamed(profile, "temp") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "x";
    const y =
      fieldNamed(profile, "y") ??
      fieldNamed(profile, "pressure") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "y";
    const layer: MockLayer = {
      geom: "density_2d",
      stat: "density_2d",
      aes: { x: f(x), y: f(y) },
    };
    const binsMatch = prompt.match(/\b(\d+)\s*bins?\b/);
    if (binsMatch !== null) {
      layer.params = { bins: Number(binsMatch[1]) };
    }
    // Scatter + isolines when the prompt asks for both.
    const layers: MockLayer[] = [];
    if (/\bscatter\b|\bpoint\b|overlay/.test(prompt)) {
      layers.push({ geom: "point", aes: { x: f(x), y: f(y) } });
    }
    layers.push(layer);
    return layers;
  }

  // geom_contour + stat_contour over a regular x/y/z grid (#801).
  if (/\bcontour\b|isolines?\b/.test(prompt)) {
    const x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
    const z =
      fieldNamed(profile, "z") ??
      fieldNamed(profile, "temp") ??
      fieldNamed(profile, "elev") ??
      fieldNamed(profile, "elevation") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "z";
    const aes: MockAes = { x: f(x), y: f(y), z: f(z) };
    const layer: MockLayer = { geom: "contour", aes };
    const levels = [...prompt.matchAll(/\b(\d+(?:\.\d+)?)\b/g)]
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n));
    // "levels at 0.5 and 1.5" → params.breaks when two+ numbers appear.
    if (/\bbreaks?\b|\blevels?\b/.test(prompt) && levels.length >= 2) {
      layer.params = { breaks: levels.slice(0, 8) };
    }
    return [layer];
  }

  return undefined;
}
