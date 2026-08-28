/**
 * Core chart families for the mock responder: ribbon, the stepped repair
 * fixture, histogram/density/boxplot/errorbar/smooth/area/scatter/line,
 * count and bar charts, jitter, rule, and the deterministic fallback.
 * Handlers return their layers in original match order; the orchestrator
 * stops at the first match.
 */
import { fieldNamed } from "./profile.ts";
import { colorFor, f, stylesFor } from "./style.ts";
import type { MockAes, MockContext, MockLayer } from "./types.ts";

export function synthesizeBasic(ctx: MockContext): MockLayer[] | undefined {
  const { prompt, profile, pick, scales, repair } = ctx;

  // Horizontal (y + xmin/xmax) vs vertical (x + ymin/ymax) ribbons.
  if (/\bribbon\b/.test(prompt) && !/without .*(?:band|ribbon)/.test(prompt)) {
    if (/\bhorizontal\b|map y to|xmin to|xmax to/.test(prompt) && !/ymin to|ymax to/.test(prompt)) {
      const y = fieldNamed(profile, "station") ?? pick.quant() ?? "y";
      const xmin =
        fieldNamed(profile, "min_depth") ?? fieldNamed(profile, "xmin") ?? pick.quant() ?? "xmin";
      const xmax =
        fieldNamed(profile, "max_depth") ?? fieldNamed(profile, "xmax") ?? pick.quant() ?? "xmax";
      return [
        {
          geom: "ribbon",
          aes: { y: f(y), xmin: f(xmin), xmax: f(xmax) },
        },
      ];
    }
    const x = fieldNamed(profile, "week") ?? pick.temporal() ?? pick.quant() ?? "x";
    const ymin = fieldNamed(profile, "lo") ?? fieldNamed(profile, "ymin") ?? pick.quant() ?? "ymin";
    const ymax = fieldNamed(profile, "hi") ?? fieldNamed(profile, "ymax") ?? pick.quant() ?? "ymax";
    return [
      {
        geom: "ribbon",
        aes: { x: f(x), ymin: f(ymin), ymax: f(ymax) },
      },
    ];
  }

  // Intentionally-invalid first attempt (unknown geom) to exercise the
  // repair round; the repair call returns the fixed valid spec.
  if (/stepp?ed/.test(prompt)) {
    const x = pick.temporal() ?? pick.quant() ?? "x";
    const y = pick.quant() ?? "y";
    if (pick.typeOf(x) === "temporal") scales["x"] = { type: "time" };
    return [
      repair
        ? {
            geom: "line",
            aes: { x: f(x), y: f(y) },
            params: { curve: "step" },
          }
        : { geom: "steps", aes: { x: f(x), y: f(y) } },
    ];
  }

  if (prompt.includes("histogram")) {
    const x = pick.quant() ?? "x";
    const aes: MockAes = { x: f(x) };
    colorFor(ctx, "fill", aes);
    return [{ geom: "histogram", aes }];
  }

  if (/\bdensity\b/.test(prompt) && !/\braster\b|\btile\b|\bheatmap\b/.test(prompt)) {
    const x = pick.quant() ?? "x";
    const aes: MockAes = { x: f(x) };
    colorFor(ctx, "color", aes);
    return [{ geom: "density", aes }];
  }

  if (/box ?plot|compare (?:the )?teams?/.test(prompt)) {
    const x = pick.cat() ?? "x";
    const y = pick.quant() ?? "y";
    return [{ geom: "boxplot", aes: { x: f(x), y: f(y) } }];
  }

  if (/error ?bars?|standard error/.test(prompt)) {
    const x = pick.cat() ?? "x";
    const y = pick.quant() ?? "y";
    const explicitBounds = /\bfrom\b.+\bto\b/.test(prompt);
    const layers: MockLayer[] = [];
    if (/jitter|individual/.test(prompt)) {
      layers.push({
        geom: "point",
        position: "jitter",
        aes: { x: f(x), y: f(y) },
      });
    } else if (explicitBounds) {
      layers.push({ geom: "point", aes: { x: f(x), y: f(y) } });
    }
    if (explicitBounds) {
      const ymin = pick.mentionedQuant() ?? "ymin";
      const ymax = pick.mentionedQuant() ?? "ymax";
      layers.push({
        geom: "errorbar",
        aes: { x: f(x), y: f(y), ymin: f(ymin), ymax: f(ymax) },
      });
    } else {
      layers.push({
        geom: "errorbar",
        stat: "summary",
        aes: { x: f(x), y: f(y) },
      });
    }
    return layers;
  }

  if (/smooth|trend line|regression|best[- ]fit|loess/.test(prompt)) {
    const first = pick.quant() ?? "x";
    const second = pick.quant() ?? "y";
    const reversed = /\b(?:against|versus|vs\.?)\b/.test(prompt);
    const x = reversed ? second : first;
    const y = reversed ? first : second;
    const aes: MockAes = { x: f(x), y: f(y) };
    colorFor(ctx, "color", aes);
    const params: Record<string, unknown> = {};
    if (/straight|linear|least.squares|\blm\b/.test(prompt)) params["method"] = "lm";
    else if (/loess|local/.test(prompt)) params["method"] = "loess";
    if (/no confidence|without .*(?:band|ribbon)/.test(prompt)) params["se"] = false;
    const smooth: MockLayer = { geom: "smooth", aes: { ...aes } };
    if (Object.keys(params).length > 0) smooth.params = params;
    return [{ geom: "point", aes: { ...aes } }, smooth];
  }

  if (/area chart|stacked area/.test(prompt)) {
    const x = pick.temporal() ?? pick.quant() ?? "x";
    const y = pick.quant() ?? "y";
    const aes: MockAes = { x: f(x), y: f(y) };
    colorFor(ctx, "fill", aes);
    if (pick.typeOf(x) === "temporal") scales["x"] = { type: "time" };
    return [{ geom: "area", aes }];
  }

  if (/scatter|\b(?:versus|vs\.?|against)\b|relationship|correlat/.test(prompt)) {
    const first = pick.quant() ?? "x";
    const second = pick.quant() ?? "y";
    const reversed = /\b(?:against|versus|vs\.?)\b/.test(prompt);
    const x = reversed ? second : first;
    const y = reversed ? first : second;
    const aes: MockAes = { x: f(x), y: f(y) };
    colorFor(ctx, "color", aes);
    stylesFor(ctx, aes);
    if (/sized by|size by/.test(prompt)) {
      const size = pick.mentionedQuant();
      if (size !== undefined) aes["size"] = f(size);
    }
    const layer: MockLayer = { geom: "point", aes };
    if (prompt.includes("jitter")) layer.position = "jitter";
    const layers: MockLayer[] = [layer];
    if (prompt.includes("label")) {
      const label = pick.mentionedCat();
      if (label !== undefined) {
        // geom_label when the prompt asks for a background box (#792);
        // plain geom_text otherwise.
        const boxed = /background box|label box|boxed label/.test(prompt);
        layers.push({
          geom: boxed ? "label" : "text",
          aes: { x: f(x), y: f(y), label: f(label) },
        });
      }
    }
    return layers;
  }

  if (
    /line chart|connected line|over time|time series|per (?:day|week|month|hour)|trend/.test(prompt)
  ) {
    const x = /identifier|model code|category/.test(prompt)
      ? (pick.mentionedCat() ?? pick.cat() ?? "x")
      : (pick.temporal() ?? pick.quant() ?? "x");
    const y = pick.quant() ?? "y";
    const aes: MockAes = { x: f(x), y: f(y) };
    colorFor(ctx, "color", aes);
    if (pick.typeOf(x) === "temporal") scales["x"] = { type: "time" };
    return [{ geom: "line", aes }];
  }

  if (/how many|count of|number of/.test(prompt)) {
    const x = pick.cat() ?? "x";
    const aes: MockAes = { x: f(x) };
    colorFor(ctx, "fill", aes);
    const layer: MockLayer = { geom: "bar", aes };
    if (/side by side|dodged/.test(prompt)) layer.position = "dodge";
    if (/proportion|share|percent/.test(prompt)) layer.position = "fill";
    return [layer];
  }

  if (/\bjitter/.test(prompt)) {
    const x = pick.cat() ?? "x";
    const y = pick.quant() ?? "y";
    return [
      {
        geom: "point",
        position: "jitter",
        aes: { x: f(x), y: f(y) },
      },
    ];
  }

  // Bare one-axis rule forms (#818 eval coverage for geom rule itself).
  if (/data-driven geom_rule|one vertical rule per|one horizontal rule per/.test(prompt)) {
    if (/aes\.y|horizontal rule/.test(prompt)) {
      const y = pick.quant() ?? "y";
      return [{ geom: "rule", aes: { y: f(y) } }];
    }
    const x = pick.quant() ?? "x";
    return [{ geom: "rule", aes: { x: f(x) } }];
  }

  if (/bar|column/.test(prompt)) {
    const x = pick.cat() ?? "x";
    const y = pick.mentionedQuant();
    const aes: MockAes = { x: f(x) };
    if (y !== undefined) aes["y"] = f(y);
    colorFor(ctx, "fill", aes);
    const geom = y === undefined ? "bar" : "col";
    const layer: MockLayer = { geom, aes };
    if (/side by side|dodged/.test(prompt)) layer.position = "dodge";
    if (/proportion|share|percent/.test(prompt)) layer.position = "fill";
    const layers: MockLayer[] = [layer];
    if (prompt.includes("label") && y !== undefined) {
      layers.push({
        geom: "text",
        position: "nudge",
        aes: { x: f(x), y: f(y), label: f(y) },
      });
    }
    return layers;
  }

  // Fallback: temporal+quant → line; two quants → point; else bar count.
  const t = pick.temporal();
  const q1 = pick.quant();
  const q2 = pick.quant();
  if (t !== undefined && q1 !== undefined) {
    scales["x"] = { type: "time" };
    return [{ geom: "line", aes: { x: f(t), y: f(q1) } }];
  }
  if (q1 !== undefined && q2 !== undefined) {
    return [{ geom: "point", aes: { x: f(q1), y: f(q2) } }];
  }
  const x = pick.cat() ?? q1 ?? "x";
  return [{ geom: "bar", aes: { x: f(x) } }];
}
