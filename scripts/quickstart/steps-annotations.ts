/**
 * Step 3 of the sakura lesson: annotate record years.
 *
 * The baseline rule, its in-panel "median" tag, the two record rings, the
 * modern record dot, and the callout leaders + labels. Ring rows ride with
 * the callouts so a record can never drift from its circle.
 */

import type { SakuraStep } from "./model";
import {
  SAKURA_BASELINE,
  SAKURA_BASELINE_LABEL,
  SAKURA_RECORDS,
  SAKURA_RECORD_RECENT,
  SAKURA_RING_EARLIEST,
  SAKURA_RING_LATEST,
} from "./sakura-data";
import { BASELINE_LABEL_CONST, RECORDS_CONST, RINGS_CONST } from "./source-constants";

export const ANNOTATE_STEP: SakuraStep = {
  id: "annotate-record-years",
  title: "Annotate record years",
  outcome: "",
  explanation: "",
  fragment: `<GeomRule yintercept="${SAKURA_BASELINE}" linewidth={1}
  aes={{ color: { value: "#6b7075" } }} inspect={false} />
<GeomText data={baselineLabel}
  aes={{ x: "year", y: "bloomDate", label: "label",
         color: { value: "#6b7075" } }} size={9} anchor="start" dy={22}
  inspect={false} />
<GeomPoint data={ringLatest} shape="circle-open" size={3.5}
  aes={{ x: "year", y: "bloomDate", color: { value: "#2c5282" } }} />
<GeomPoint data={ringEarliest} shape="circle-open" size={3.5}
  aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }} />
<GeomPoint data={recordRecent} size={3}
  aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }} />
<GeomSegment data={records}
  aes={{ x: "labelYear", y: "labelDate", xend: "year",
         yend: "bloomDate", color: { value: "#b3452f" } }} linewidth={0.7} />
<GeomText data={records}
  aes={{ x: "labelYear", y: "labelDate", label: "label",
         color: { value: "#b3452f" } }} size={11} anchor="end" dx={-4} />`,
  spec: {
    layers: {
      baseline: {
        geom: "rule",
        // Solid and full strength: it marks the pre-industrial median, and
        // the short in-panel tag at the left edge says so (#727).
        aes: { color: { value: "#6b7075" } },
        params: { yintercept: SAKURA_BASELINE, linewidth: 1 },
        // Synthesizes an empty row — hovering it must not blank the blooms'
        // tooltips (#1068, same as the chartlines).
        inspect: false,
      },
      baselineLab: {
        geom: "text",
        data: { values: SAKURA_BASELINE_LABEL },
        aes: {
          x: { field: "year" },
          y: { field: "bloomDate" },
          label: { field: "label" },
          color: { value: "#6b7075" },
        },
        params: { size: 9, anchor: "start", dy: 22 },
        // Names the rule, like the epoch names name the bands (#1068).
        inspect: false,
      },
      ringLatest: {
        geom: "point",
        data: { values: SAKURA_RING_LATEST },
        aes: {
          x: { field: "year" },
          y: { field: "bloomDate" },
          color: { value: "#2c5282" },
        },
        params: { shape: "circle-open", size: 3.5 },
      },
      ringEarliest: {
        geom: "point",
        data: { values: SAKURA_RING_EARLIEST },
        aes: {
          x: { field: "year" },
          y: { field: "bloomDate" },
          color: { value: "#c53030" },
        },
        params: { shape: "circle-open", size: 3.5 },
      },
      recordRecent: {
        geom: "point",
        data: { values: SAKURA_RECORD_RECENT },
        aes: {
          x: { field: "year" },
          y: { field: "bloomDate" },
          color: { value: "#c53030" },
        },
        params: { size: 3 },
      },
      leaders: {
        geom: "segment",
        data: { values: SAKURA_RECORDS },
        aes: {
          x: { field: "labelYear" },
          y: { field: "labelDate" },
          xend: { field: "year" },
          yend: { field: "bloomDate" },
          color: { value: "#b3452f" },
        },
        params: { linewidth: 0.7, alpha: 0.9 },
      },
      callouts: {
        geom: "text",
        data: { values: SAKURA_RECORDS },
        aes: {
          x: { field: "labelYear" },
          y: { field: "labelDate" },
          label: { field: "label" },
          color: { value: "#b3452f" },
        },
        // Every label sits left of its point, so anchoring at the end puts
        // the text and the leader on opposite sides of the same coordinate
        // and no leader can run back through its own words.
        params: { size: 11, anchor: "end", dx: -4 },
      },
    },
    order: [
      "epochs",
      "epochNames",
      "chartlineEarly",
      "chartlineLate",
      "points",
      "baseline",
      "baselineLab",
      "trend",
      "ringLatest",
      "ringEarliest",
      "recordRecent",
      "leaders",
      "callouts",
    ],
  },
  source: {
    components: ["GeomPoint", "GeomRule", "GeomSegment", "GeomText"],
    consts: [RECORDS_CONST, RINGS_CONST, BASELINE_LABEL_CONST],
    children: {
      baseline: `  <GeomRule
    yintercept="${SAKURA_BASELINE}"
    linewidth={1}
    aes={{ color: { value: "#6b7075" } }}
    inspect={false}
  />`,
      baselineLab: `  <GeomText
    data={baselineLabel}
    aes={{
      x: "year",
      y: "bloomDate",
      label: "label",
      color: { value: "#6b7075" },
    }}
    size={9}
    anchor="start"
    dy={22}
    inspect={false}
  />`,
      ringLatest: `  <GeomPoint
    data={ringLatest}
    shape="circle-open"
    size={3.5}
    aes={{ x: "year", y: "bloomDate", color: { value: "#2c5282" } }}
  />`,
      ringEarliest: `  <GeomPoint
    data={ringEarliest}
    shape="circle-open"
    size={3.5}
    aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }}
  />`,
      recordRecent: `  <GeomPoint
    data={recordRecent}
    size={3}
    aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }}
  />`,
      leaders: `  <GeomSegment
    data={records}
    aes={{
      x: "labelYear",
      y: "labelDate",
      xend: "year",
      yend: "bloomDate",
      color: { value: "#b3452f" },
    }}
    linewidth={0.7}
    alpha={0.9}
  />`,
      callouts: `  <GeomText
    data={records}
    aes={{
      x: "labelYear",
      y: "labelDate",
      label: "label",
      color: { value: "#b3452f" },
    }}
    size={11}
    anchor="end"
    dx={-4}
  />`,
    },
    childOrder: [
      "epochs",
      "epochNames",
      "chartlineEarly",
      "chartlineLate",
      "points",
      "baseline",
      "baselineLab",
      "trend",
      "ringLatest",
      "ringEarliest",
      "recordRecent",
      "leaders",
      "callouts",
    ],
  },
};
