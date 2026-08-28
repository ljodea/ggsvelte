/**
 * The Svelte `const` blocks the lesson's source deltas embed verbatim.
 *
 * Template strings must stay byte-identical to what the finished file showed
 * before the split — they are copyable reader-facing source, pinned by the
 * sakura-lesson tests. All values derive from `./sakura-data.ts`.
 */

import {
  SAKURA_BASELINE,
  SAKURA_EPOCHS,
  SAKURA_EPOCH_NAMES,
  SAKURA_RECORDS,
  SAKURA_RECORD_RECENT,
  SAKURA_RING_EARLIEST,
  SAKURA_RING_LATEST,
} from "./sakura-data";

export const EPOCHS_CONST = `  // Bands cover every observation; a strip above holds the epoch names.
  const span = { top: "${SAKURA_EPOCHS[0]!.top}", bottom: "${SAKURA_EPOCHS[0]!.bottom}" };
  const epochs = [
${SAKURA_EPOCHS.map(
  (e) => `    { epoch: "${e.epoch}", year: ${e.year}, until: ${e.until}, ...span },`,
).join("\n")}
  ];`;

export const RECORDS_CONST = `  const records = [
${SAKURA_RECORDS.map(
  (r) =>
    `    {\n      year: ${r.year}, bloomDate: "${r.bloomDate}",\n      labelYear: ${r.labelYear}, labelDate: "${r.labelDate}",\n      label: "${r.label}",\n    },`,
).join("\n")}
  ];`;

export const BASELINE_LABEL_CONST = `  const baselineLabel = [
    { year: 812, bloomDate: "${SAKURA_BASELINE}", label: "median" },
  ];`;

// Two-column rows only — same shape as SAKURA_RING_* / the fold spec — so a
// reader who copies the finished file does not get callout fields in ring
// tooltips that the live lesson chart never shows.
export const RINGS_CONST = `  // Ring treatment from the reference: an open blue ring on the latest
  // bloom, an open red ring on the earliest, a filled red dot on the modern record.
  const ringLatest = [{ year: ${SAKURA_RING_LATEST[0]!.year}, bloomDate: "${SAKURA_RING_LATEST[0]!.bloomDate}" }];
  const ringEarliest = [{ year: ${SAKURA_RING_EARLIEST[0]!.year}, bloomDate: "${SAKURA_RING_EARLIEST[0]!.bloomDate}" }];
  const recordRecent = [{ year: ${SAKURA_RECORD_RECENT[0]!.year}, bloomDate: "${SAKURA_RECORD_RECENT[0]!.bloomDate}" }];`;

export const EPOCH_NAMES_CONST = `  const epochNames = [
${SAKURA_EPOCH_NAMES.map(
  (n) => `    { epoch: "${n.epoch}", midYear: ${n.midYear}, nameDate: "${n.nameDate}" },`,
).join("\n")}
  ];`;

export const EPOCH_DOMAIN = SAKURA_EPOCHS.map((e) => `"${e.epoch}"`).join(", ");
export const EPOCH_VALUES = '"#f5edc4", "#dce8f2", "#f3dcda"';
