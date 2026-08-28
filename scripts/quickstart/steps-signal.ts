/**
 * Step 1 of the sakura lesson: pick a minimal theme and add a rolling median.
 *
 * Theme + trend + y-tick polish in one step. Reverse already ships on the
 * first render (base fold); this only sets readable Apr day breaks, date
 * labels, and a domain strip for later epoch names — not a second reverse.
 * Dotted chartlines hang off the two outer breaks so each labeled date has
 * a line a reader can use, matching the reference chart. Fragment order
 * matches ggplot2 thinking order (marks → scales → theme), same as
 * foldSakura grammar emission — not the polish-first reading order.
 */

import type { SakuraStep } from "./model";
import {
  DOMAIN_BOTTOM,
  DOMAIN_TOP,
  SAKURA_TREND_WINDOW,
  SAKURA_Y_BREAKS,
  SAKURA_Y_LAB,
} from "./sakura-data";

export const SIGNAL_STEP: SakuraStep = {
  id: "separate-signal-from-noise",
  title: "Pick a minimal theme and add a rolling median line",
  outcome: "",
  explanation: "",
  fragment: `<GeomRule yintercept="${SAKURA_Y_BREAKS[0]}" linewidth={0.75}
  aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
  inspect={false} />
<GeomRule yintercept="${SAKURA_Y_BREAKS[2]}" linewidth={0.75}
  aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
  inspect={false} />
<GeomPoint alpha={0.55} size={1.4}
  aes={{ color: { value: "#4a5568" } }} />
<GeomLine stat="summary_rolling" fun="median" window={${SAKURA_TREND_WINDOW}}
  curve="linear" linewidth={1.8}
  aes={{ color: { value: "#262626" } }} />
<ScaleYMonthDay
  reverse
  breaks={[${SAKURA_Y_BREAKS.map((d) => `"${d}"`).join(", ")}]}
  dateLabels="%b %e"
  domain={["${DOMAIN_BOTTOM}", "${DOMAIN_TOP}"]}
/>
<ThemeTufte />`,
  spec: {
    theme: "tufte",
    scales: {
      y: {
        type: "time",
        temporalKind: "monthDay",
        reverse: true,
        breaks: [...SAKURA_Y_BREAKS],
        dateLabels: "%b %e",
        domain: [DOMAIN_BOTTOM, DOMAIN_TOP],
      },
    },
    labs: { x: "Year", y: SAKURA_Y_LAB },
    layers: {
      chartlineEarly: {
        geom: "rule",
        aes: { color: { value: "#b7c1cd" }, linetype: { value: "dotted" } },
        params: { yintercept: SAKURA_Y_BREAKS[0], linewidth: 0.75 },
        // Chrome duplicating an axis break; answers no tooltip (#1068).
        inspect: false,
      },
      chartlineLate: {
        geom: "rule",
        aes: { color: { value: "#b7c1cd" }, linetype: { value: "dotted" } },
        params: { yintercept: SAKURA_Y_BREAKS[2], linewidth: 0.75 },
        inspect: false,
      },
      points: {
        geom: "point",
        aes: { color: { value: "#4a5568" } },
        params: { alpha: 0.55, size: 1.4 },
      },
      trend: {
        geom: "line",
        stat: "summary_rolling",
        aes: { color: { value: "#262626" } },
        params: {
          fun: "median",
          window: SAKURA_TREND_WINDOW,
          curve: "linear",
          linewidth: 1.8,
        },
      },
    },
    order: ["chartlineEarly", "chartlineLate", "points", "trend"],
  },
  source: {
    components: ["GeomLine", "GeomRule", "ThemeTufte"],
    // stat="summary_rolling" on the basic GeomLine shell: opt into the family.
    registers: ["registerSummaryRolling"],
    grammar: {
      theme: `  <ThemeTufte />`,
      scaleY: `  <ScaleYMonthDay
    reverse
    breaks={[${SAKURA_Y_BREAKS.map((d) => `"${d}"`).join(", ")}]}
    dateLabels="%b %e"
    domain={["${DOMAIN_BOTTOM}", "${DOMAIN_TOP}"]}
  />`,
      labs: `  <Labs x="Year" y="${SAKURA_Y_LAB}" />`,
    },
    children: {
      chartlineEarly: `  <GeomRule
    yintercept="${SAKURA_Y_BREAKS[0]}"
    linewidth={0.75}
    aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
    inspect={false}
  />`,
      chartlineLate: `  <GeomRule
    yintercept="${SAKURA_Y_BREAKS[2]}"
    linewidth={0.75}
    aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
    inspect={false}
  />`,
      points: `  <GeomPoint
    alpha={0.55}
    size={1.4}
    aes={{ color: { value: "#4a5568" } }}
  />`,
      trend: `  <GeomLine
    stat="summary_rolling"
    fun="median"
    window={${SAKURA_TREND_WINDOW}}
    curve="linear"
    linewidth={1.8}
    aes={{ color: { value: "#262626" } }}
  />`,
    },
    childOrder: ["chartlineEarly", "chartlineLate", "points", "trend"],
  },
};
