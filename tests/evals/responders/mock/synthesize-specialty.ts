/**
 * Specialty geom families for the mock responder: function curves, interval
 * geoms, qq, step, count, violin, label, polygon, spoke, and blank.
 * Handlers return their layers in original match order; the orchestrator
 * stops at the first match.
 */
import { fieldNamed } from "./profile.ts";
import { colorFor, f } from "./style.ts";
import type { MockAes, MockContext, MockLayer } from "./types.ts";

type SpecialtyHandler = (ctx: MockContext) => MockLayer[] | undefined;

function synthesizeFunction(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // geom_function / stat_function: portable named registry curve (#797).
  if (
    /\bgeom[_\s]?function\b|\bstat[_\s]?function\b|\bdnorm\b|\bpnorm\b|\banalytical? (?:curve|function)\b|\bnormal density\b/.test(
      prompt,
    )
  ) {
    const fun = /\bpnorm\b/.test(prompt)
      ? "pnorm"
      : /\bdnorm\b|\bnormal density\b|\bpdf\b/.test(prompt)
        ? "dnorm"
        : /\blinear\b/.test(prompt)
          ? "linear"
          : "identity";
    const params: Record<string, unknown> = { fun };
    const xlimMatch = prompt.match(/\bxlim from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)/i);
    if (xlimMatch) {
      params["xlim"] = [Number(xlimMatch[1]), Number(xlimMatch[2])];
    } else if (/\bxlim\b|\[-?3/.test(prompt)) {
      params["xlim"] = [-3, 3];
    }
    const nMatch = prompt.match(/\b(\d+)\s+evaluation points?\b/i);
    if (nMatch) params["n"] = Number(nMatch[1]);
    else if (fun === "dnorm") params["n"] = 101;
    if (fun === "dnorm" || fun === "pnorm") params["args"] = { mean: 0, sd: 1 };

    const layers: MockLayer[] = [];
    const x = fieldNamed(profile, "x");
    if (x !== undefined && fieldNamed(profile, "y") !== undefined) {
      layers.push({
        geom: "point",
        aes: { x: f(x), y: f("y") },
      });
    }
    const functionAes: MockAes = { y: { stat: "y" } };
    // When xlim is set, x need not be mapped (domain comes from params.xlim).
    if (x !== undefined) functionAes.x = f(x);
    else if (params["xlim"] === undefined) {
      const fallbackX = pick.quant();
      if (fallbackX !== undefined) functionAes.x = f(fallbackX);
    }
    layers.push({
      geom: "function",
      stat: "function",
      aes: functionAes,
      params,
    });
    return layers;
  }

  return undefined;
}

function synthesizeInterval(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // Interval family beyond errorbar (#793). Multi-geom prompts emit all
  // named forms so corpus golds with three layers stay mock-reachable.
  if (/\bgeom[_\s]?linerange\b|\bgeom[_\s]?pointrange\b|\bgeom[_\s]?crossbar\b/.test(prompt)) {
    const x = fieldNamed(profile, "group") ?? fieldNamed(profile, "treatment") ?? pick.cat() ?? "x";
    const y = fieldNamed(profile, "mid") ?? fieldNamed(profile, "value") ?? pick.quant() ?? "y";
    const summary = /\bsummary\b|\bmean\b/.test(prompt);
    const lo = fieldNamed(profile, "lo");
    const hi = fieldNamed(profile, "hi");
    // Underscore in geom_linerange is a word char, so \b linerange fails —
    // match bare names with optional geom_ / geom prefix.
    const named = (
      [
        ["linerange", /(?:geom[_\s]?)?linerange/.test(prompt)],
        ["pointrange", /(?:geom[_\s]?)?pointrange/.test(prompt)],
        ["crossbar", /(?:geom[_\s]?)?crossbar/.test(prompt)],
      ] as const
    ).filter(([, hit]) => hit);
    const layers: MockLayer[] = [];
    for (const [geom] of named.length > 0 ? named : ([["linerange", true]] as const)) {
      const aes: MockAes = { x: f(x) };
      if (summary || geom !== "linerange") aes.y = f(y);
      if (!summary && lo !== undefined && hi !== undefined) {
        aes.ymin = f(lo);
        aes.ymax = f(hi);
      }
      const layer: MockLayer = { geom, aes };
      if (summary) layer.stat = "summary";
      layers.push(layer);
    }
    return layers;
  }

  return undefined;
}

function synthesizeQq(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // geom_qq + geom_qq_line: sample channel (ggplot2 aes.sample) (#804).
  if (
    /\bq-?q\b/.test(prompt) ||
    /\bgeom[_\s]?qq(?:_line)?\b/.test(prompt) ||
    (/\bnormal\b/.test(prompt) && /\breference line\b/.test(prompt))
  ) {
    const sample =
      fieldNamed(profile, "height") ??
      fieldNamed(profile, "latency") ??
      fieldNamed(profile, "sample") ??
      pick.quant() ??
      "sample";
    const sampleAes: MockAes = { sample: f(sample) };
    const layers: MockLayer[] = [{ geom: "qq", aes: sampleAes }];
    if (
      /\breference line\b|\bqq_line\b|\bqq-line\b/.test(prompt) ||
      /\bwith a normal\b/.test(prompt)
    ) {
      layers.push({ geom: "qq_line", aes: { sample: f(sample) } });
    }
    return layers;
  }

  return undefined;
}

function synthesizeStep(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, pick } = ctx;

  // geom_step: hv/vh staircase polylines (#789). Not the intentional
  // "stepped" unknown-geom repair fixture handled in the basic families.
  if (
    (/\bgeom[_\s]?step\b|\bstep (?:line|chart)\b/.test(prompt) ||
      (/\bstep\b/.test(prompt) &&
        /\bhold(?:s|ing)?\b|\bcumulative\b|\bthermostat\b|\bsetpoint\b|\bdirection\b/.test(
          prompt,
        ))) &&
    !/stepp?ed/.test(prompt)
  ) {
    const x = pick.temporal() ?? pick.quant() ?? "x";
    const y = pick.quant() ?? "y";
    const layer: MockLayer = { geom: "step", aes: { x: f(x), y: f(y) } };
    if (/\bstart of each interval\b|\bdirection\b.*\bvh\b|\bvh\b/.test(prompt)) {
      layer.params = { direction: "vh" };
    }
    return [layer];
  }

  return undefined;
}

function synthesizeCount(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // geom_count: stat sum at unique (x, y); size defaults to after_stat n (#795).
  if (/\bgeom[_\s]?count\b|\boverplotting\b/.test(prompt)) {
    const x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
    const aes: MockAes = { x: f(x), y: f(y) };
    colorFor(ctx, "color", aes);
    return [{ geom: "count", aes }];
  }

  return undefined;
}

function synthesizeViolin(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, pick } = ctx;

  // geom_violin: mirrored ydensity polygons per discrete x (#798).
  if (/\bgeom[_\s]?violin\b|\bviolin plots?\b|\bviolin\b/.test(prompt)) {
    const x = pick.mentionedCat() ?? pick.cat() ?? "x";
    const y = pick.mentionedQuant() ?? pick.quant() ?? "y";
    const layer: MockLayer = { geom: "violin", aes: { x: f(x), y: f(y) } };
    colorFor(ctx, "fill", layer.aes);
    // mentionedCat() is consumed by x above, so "filled by <that field>"
    // falls back to the discrete x — the usual violin spelling.
    if (layer.aes.fill === undefined && /filled by|fill by/.test(prompt)) {
      layer.aes.fill = f(x);
    }
    return [layer];
  }

  return undefined;
}

function synthesizeLabel(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, pick } = ctx;

  // geom_label alone: boxed text marks, no companion point layer (#792).
  if (
    !/\bscatter\b/.test(prompt) &&
    /\bas labels?\b|\bgeom[_\s]?label\b/.test(prompt) &&
    /background box|label box|boxed label/.test(prompt)
  ) {
    const x = pick.quant() ?? "x";
    const y = pick.quant() ?? "y";
    const label = pick.mentionedCat() ?? pick.cat();
    const aes: MockAes = { x: f(x), y: f(y) };
    if (label !== undefined) aes.label = f(label);
    const layer: MockLayer = { geom: "label", aes };
    colorFor(ctx, "fill", layer.aes);
    return [layer];
  }

  return undefined;
}

function synthesizePolygon(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // geom_polygon: closed filled rings in data order, one per group (#807).
  // Vertex fields are positional, not prompt-ordered — prefer literal x/y.
  if (
    /\bgeom[_\s]?polygon\b|\bclosed (?:filled )?(?:region|shape|ring)s?\b|\bfilled regions?\b|\bquadrilateral\b/.test(
      prompt,
    )
  ) {
    const x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
    const layer: MockLayer = { geom: "polygon", aes: { x: f(x), y: f(y) } };
    colorFor(ctx, "fill", layer.aes);
    return [layer];
  }

  return undefined;
}

function synthesizeSpoke(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // geom_spoke: origin + angle (radians) + radius → segment (#810).
  if (
    /\bgeom[_\s]?spoke\b|\bspoke\b|\bvector field\b/.test(prompt) &&
    (fieldNamed(profile, "angle") !== undefined ||
      fieldNamed(profile, "radius") !== undefined ||
      /\bangle\b/.test(prompt) ||
      /\bradius\b/.test(prompt) ||
      /\bparams\b/.test(prompt) ||
      /\bconstant\b/.test(prompt))
  ) {
    const x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
    const y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
    const aes: MockAes = { x: f(x), y: f(y) };
    const layer: MockLayer = { geom: "spoke", aes };
    if (fieldNamed(profile, "angle") !== undefined) aes.angle = f("angle");
    if (fieldNamed(profile, "radius") !== undefined) aes.radius = f("radius");
    // Constant angle/radius when the prompt asks for params (no mapped cols).
    if (aes.angle === undefined || aes.radius === undefined) {
      const params: Record<string, unknown> = {};
      if (aes.angle === undefined) params["angle"] = 0;
      if (aes.radius === undefined) params["radius"] = 1;
      layer.params = params;
    }
    return [layer];
  }

  return undefined;
}

function synthesizeBlank(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick } = ctx;

  // geom_blank: scale training without marks (#791).
  if (
    /\bgeom[_\s]?blank\b|\bblank layer\b|\bblank geom\b|\btrain(?:s|ing)? (?:the )?scales?\b.*\bblank\b|\bblank\b.*\bno marks\b/.test(
      prompt,
    ) ||
    (/\bblank\b/.test(prompt) &&
      (/\bdomain\b/.test(prompt) || /\bexpand\b/.test(prompt) || /\bno marks\b/.test(prompt)))
  ) {
    const aes: MockAes = {};
    const layers: MockLayer[] = [];
    if (fieldNamed(profile, "x_plan") === undefined) {
      const x = fieldNamed(profile, "x") ?? pick.quant() ?? "x";
      const y = fieldNamed(profile, "y") ?? pick.quant() ?? "y";
      aes.x = f(x);
      aes.y = f(y);
    } else {
      aes.x = f("x_plan");
      if (fieldNamed(profile, "y_plan") !== undefined) aes.y = f("y_plan");
      if (fieldNamed(profile, "x") !== undefined && fieldNamed(profile, "y") !== undefined) {
        layers.push({
          geom: "point",
          aes: { x: f("x"), y: f("y") },
        });
      }
    }
    layers.push({ geom: "blank", aes });
    return layers;
  }

  return undefined;
}

const SPECIALTY_HANDLERS: SpecialtyHandler[] = [
  synthesizeFunction,
  synthesizeInterval,
  synthesizeQq,
  synthesizeStep,
  synthesizeCount,
  synthesizeViolin,
  synthesizeLabel,
  synthesizePolygon,
  synthesizeSpoke,
  synthesizeBlank,
];

export function synthesizeSpecialty(ctx: MockContext): MockLayer[] | undefined {
  for (const handler of SPECIALTY_HANDLERS) {
    const layers = handler(ctx);
    if (layers !== undefined) return layers;
  }
  return undefined;
}
