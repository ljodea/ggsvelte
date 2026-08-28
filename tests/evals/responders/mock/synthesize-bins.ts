/**
 * Binned/aggregate geom families for the mock responder: raster, hex, bin_2d,
 * tile, rect, segment, and map. Handlers return their layers in original
 * match order; the orchestrator stops at the first match.
 */
import { fieldNamed } from "./profile.ts";
import { colorFor, f } from "./style.ts";
import type { MockAes, MockContext, MockLayer } from "./types.ts";

export function synthesizeBins(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  if (/\braster\b/.test(prompt)) {
    const x = fieldNamed(profile, "x") ?? fieldNamed(profile, "lon") ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? fieldNamed(profile, "lat") ?? pick.quant() ?? "y";
    const fill =
      fieldNamed(profile, "z") ??
      fieldNamed(profile, "elev") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "z";
    const aes: MockAes = { x: f(x), y: f(y), fill: f(fill) };
    return [{ geom: "raster", aes }];
  }

  // geom_hex / hexagonal bin heatmap — must win over bare "heatmap" → tile (#800).
  if (/\bhex(?:agon(?:al)?)?(?:\s+bin)?\b|\bgeom[_\s]?hex\b|\bbin_hex\b/.test(prompt)) {
    const x =
      fieldNamed(profile, "distance") ??
      fieldNamed(profile, "humidity") ??
      fieldNamed(profile, "x") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "x";
    const y =
      fieldNamed(profile, "delay") ??
      fieldNamed(profile, "temperature") ??
      fieldNamed(profile, "y") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "y";
    const layer: MockLayer = {
      geom: "hex",
      stat: "bin_hex",
      position: "identity",
      aes: {
        x: f(x),
        y: f(y),
        fill: { stat: "count" },
      },
    };
    const binsMatchHex = prompt.match(/\b(\d+)\s*bins?\b/);
    if (binsMatchHex !== null) layer.params = { bins: Number(binsMatchHex[1]) };
    return [layer];
  }

  if (
    /\bgeom[_\s]?bin[_ ]?2d\b|\bbin[_ ]?2d\b|\b2d bin(?:ned)? heatmap\b|\b2d rectangular bins?\b|\brectangular bins?\b.*\bheatmap\b|\bheatmap\b.*\brectangular bins?\b|\bbin heatmap\b/.test(
      prompt,
    )
  ) {
    // Prefer domain field names used in eval golds (distance/delay, humidity/temp).
    const x =
      fieldNamed(profile, "distance") ??
      fieldNamed(profile, "humidity") ??
      fieldNamed(profile, "x") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "x";
    const y =
      fieldNamed(profile, "delay") ??
      fieldNamed(profile, "temperature") ??
      fieldNamed(profile, "y") ??
      pick.mentionedQuant() ??
      pick.quant() ??
      "y";
    const layer: MockLayer = {
      geom: "bin_2d",
      stat: "bin_2d",
      position: "identity",
      aes: { x: f(x), y: f(y), fill: { stat: "count" } },
    };
    const binsMatch = prompt.match(/\b(\d+)\s*bins?\b/);
    if (binsMatch !== null) layer.params = { bins: Number(binsMatch[1]) };
    return [layer];
  }

  if (/\b(?:geom )?tiles?\b|heatmap/.test(prompt)) {
    const cats = profile.fields.filter(
      (field) => field.type === "nominal" || field.type === "ordinal",
    );
    const quants = profile.fields.filter((field) => field.type === "quantitative");
    let x: string;
    let y: string;
    let fill: string;
    if (cats.length >= 2) {
      x = cats[0]!.name;
      y = cats[1]!.name;
      fill = quants[0]?.name ?? pick.quant() ?? "n";
    } else {
      x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
      y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
      fill =
        fieldNamed(profile, "reading") ??
        fieldNamed(profile, "n") ??
        pick.mentionedQuant() ??
        pick.quant() ??
        "n";
    }
    const aes: MockAes = { x: f(x), y: f(y), fill: f(fill) };
    return [{ geom: "tile", aes }];
  }

  if (/\brectangles?\b|\bgeom rect\b|\brect\b.*xmin|\bxmin\/xmax\b/.test(prompt)) {
    const xmin =
      fieldNamed(profile, "xmin") ?? fieldNamed(profile, "start") ?? pick.quant() ?? "xmin";
    const xmax =
      fieldNamed(profile, "xmax") ?? fieldNamed(profile, "end") ?? pick.quant() ?? "xmax";
    const ymin = fieldNamed(profile, "ymin") ?? fieldNamed(profile, "lo") ?? pick.quant() ?? "ymin";
    const ymax = fieldNamed(profile, "ymax") ?? fieldNamed(profile, "hi") ?? pick.quant() ?? "ymax";
    const aes: MockAes = {
      xmin: f(xmin),
      xmax: f(xmax),
      ymin: f(ymin),
      ymax: f(ymax),
    };
    const fill = pick.cat() ?? pick.mentionedCat();
    if (fill !== undefined) aes.fill = f(fill);
    const layer: MockLayer = { geom: "rect", aes };
    if (/semi-transparent|alpha/.test(prompt)) layer.params = { alpha: 0.4 };
    return [layer];
  }

  if (/\bsegment\b|leader line|xend|yend/.test(prompt)) {
    const x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
    const xend = fieldNamed(profile, "xend") ?? fieldNamed(profile, "x2") ?? pick.quant() ?? "xend";
    const yend = fieldNamed(profile, "yend") ?? fieldNamed(profile, "y2") ?? pick.quant() ?? "yend";
    const aes: MockAes = {
      x: f(x),
      y: f(y),
      xend: f(xend),
      yend: f(yend),
    };
    colorFor(ctx, "color", aes);
    return [{ geom: "segment", aes }];
  }

  // geom_map (#808): join value map_id to an inline fortified triangle set.
  if (/\bgeom map\b|\bfortified\b/.test(prompt)) {
    const idField =
      fieldNamed(profile, "region") ??
      fieldNamed(profile, "zone") ??
      pick.cat() ??
      pick.mentionedCat() ??
      "region";
    const fillField =
      fieldNamed(profile, "rate") ?? fieldNamed(profile, "score") ?? pick.quant() ?? "rate";
    const aes: MockAes = { map_id: f(idField), fill: f(fillField) };
    const idKey =
      /\bmapid\b|\bid\b/.test(prompt) && fieldNamed(profile, "zone") !== undefined ? "id" : idField;
    const regions = ["A", "B", "C"];
    const mapValues: Array<Record<string, unknown>> = [];
    for (let i = 0; i < regions.length; i++) {
      const id = regions[i]!;
      const ox = i * 1.2;
      mapValues.push(
        { long: ox, lat: 0, [idKey]: id },
        { long: ox + 1, lat: 0, [idKey]: id },
        { long: ox + 0.5, lat: 1, [idKey]: id },
      );
    }
    const params: Record<string, unknown> = { map: { values: mapValues } };
    if (idKey !== "region" && idKey !== "id") params["mapId"] = idKey;
    if (idKey === "id") params["mapId"] = "id";
    return [{ geom: "map", aes, params }];
  }

  return undefined;
}
