/**
 * Step 2 of the sakura lesson: add epoch bands.
 *
 * inspect: false — bands are labelled decoration (#1068). A full-panel
 * rect reports distance 0 everywhere it is painted, so without the opt-out
 * nearest never reaches a bloom observation or the trend.
 */

import type { SakuraStep } from "./model";
import { SAKURA_EPOCHS, SAKURA_EPOCH_NAMES } from "./sakura-data";
import { EPOCHS_CONST, EPOCH_DOMAIN, EPOCH_NAMES_CONST, EPOCH_VALUES } from "./source-constants";

export const EPOCHS_STEP: SakuraStep = {
  id: "add-epoch-bands",
  title: "Add epochs",
  outcome: "",
  explanation: "",
  fragment: `<GeomRect
  data={epochs}
  aes={{
    x: null, y: null,
    xmin: "year", xmax: "until", ymin: "top", ymax: "bottom",
    fill: "epoch",
  }}
  alpha={0.55}
  inspect={false}
/>
<GeomText data={epochNames}
  aes={{ x: "midYear", y: "nameDate", label: "epoch",
         color: { value: "#6b7075" } }} size={11} inspect={false} />
<ScaleFillManual
  domain={[${EPOCH_DOMAIN}]}
  values={[${EPOCH_VALUES}]}
/>
<GuideNone channel="fill" />`,
  spec: {
    layers: {
      epochs: {
        geom: "rect",
        data: { values: SAKURA_EPOCHS },
        aes: {
          x: null,
          y: null,
          xmin: { field: "year" },
          xmax: { field: "until" },
          ymin: { field: "top" },
          ymax: { field: "bottom" },
          fill: { field: "epoch" },
        },
        params: { alpha: 0.55 },
        inspect: false,
      },
      // Names the bands where the reader is already looking, instead of
      // sending them to a colour key at the foot of the plot.
      epochNames: {
        geom: "text",
        data: { values: SAKURA_EPOCH_NAMES },
        aes: {
          x: { field: "midYear" },
          y: { field: "nameDate" },
          label: { field: "epoch" },
          color: { value: "#6b7075" },
        },
        params: { size: 11 },
        // Decorations, like the bands they name (#1068).
        inspect: false,
      },
    },
    order: ["epochs", "epochNames", "chartlineEarly", "chartlineLate", "points", "trend"],
    scales: {
      fill: {
        type: "manual",
        domain: SAKURA_EPOCHS.map((epoch) => epoch.epoch),
        range: ["#f5edc4", "#dce8f2", "#f3dcda"],
      },
    },
    // A mapped fill draws a legend by default, so the names above the bands
    // would be repeated in a key at the foot of the plot. Turning it off is
    // the point of drawing them there.
    guides: { fill: { type: "none" } },
  },
  source: {
    components: ["GeomRect", "GeomText", "ScaleFillManual", "GuideNone"],
    consts: [EPOCHS_CONST, EPOCH_NAMES_CONST],
    grammar: {
      scaleFill: `  <ScaleFillManual
    domain={[${EPOCH_DOMAIN}]}
    values={[${EPOCH_VALUES}]}
  />`,
      guides: `  <GuideNone channel="fill" />`,
    },
    children: {
      epochs: `  <GeomRect
    data={epochs}
    aes={{
      x: null,
      y: null,
      xmin: "year",
      xmax: "until",
      ymin: "top",
      ymax: "bottom",
      fill: "epoch",
    }}
    alpha={0.55}
    inspect={false}
  />`,
      epochNames: `  <GeomText
    data={epochNames}
    aes={{
      x: "midYear",
      y: "nameDate",
      label: "epoch",
      color: { value: "#6b7075" },
    }}
    size={11}
    inspect={false}
  />`,
    },
    childOrder: ["epochs", "epochNames", "chartlineEarly", "chartlineLate", "points", "trend"],
  },
};
