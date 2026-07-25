/**
 * Default-tooltip display collapse for identical field lists (#385).
 *
 * Public inspection snapshots still list every axis-group candidate (line +
 * point, multi-layer, custom content / oninspect). Only presentation layers
 * that render the default field rows should collapse identical *display*
 * payloads so users never see the same period/value block twice.
 */
import type { CellValue } from "@ggsvelte/core";

import type { NonEmptyReadonlyArray, PlotDatum, TooltipField } from "../interaction/interaction.js";

/** Shared with Tooltip.svelte so equality matches what the user sees. */
export function formatTooltipCell(value: CellValue): string {
  if (value === null) return "–";
  if (value instanceof Date) {
    // Invalid Date throws on toISOString — keyboard live-text tokens must not.
    const time = value.getTime();
    if (Number.isNaN(time)) return "–";
    return value.toISOString();
  }
  if (typeof value === "number") return String(Math.round(value * 1000) / 1000);
  return String(value);
}

/**
 * Default tooltip `<dt>` text when no lab title is available (#752).
 * Light humanization only — camelCase / snake_case → spaced words. Does not
 * invent domain semantics ("crimePersons" stays "crime persons", not "count").
 */
export function tooltipFieldLabel(fieldName: string): string {
  if (fieldName.length === 0) return fieldName;
  const spaced = fieldName
    .replaceAll("_", " ")
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  // Preserve intentional Title Case single tokens (e.g. "Region"); only fold
  // multi-word camelCase into lowercase words for scanability.
  if (!/\s/.test(spaced)) return spaced;
  return spaced.replaceAll(/\S+/g, (word) => word.toLowerCase());
}

/**
 * Fields shown in the default tooltip body for a member (#754).
 * Axis-mode inspections already print the shared axis value as a header, so
 * repeating the matching channel under every member is pure noise.
 */
export function fieldsForDefaultTooltip(
  fields: readonly TooltipField[],
  mode: "exact" | "xy" | "x" | "y",
): readonly TooltipField[] {
  if (mode !== "x" && mode !== "y") return fields;
  return fields.filter((field) => field.channel !== mode);
}

/**
 * Stable token for one member's default-tooltip body.
 * Uses field *names* (dt text) + formatted values (dd text), not channel —
 * channels are not shown and must not split visually identical rows.
 */
export function tooltipDisplayPayloadToken(fields: readonly TooltipField[]): string {
  // Length-prefix each segment so field names / values cannot forge delimiters.
  const parts: string[] = [];
  for (const field of fields) {
    const name = field.field;
    const display = formatTooltipCell(field.value);
    parts.push(`${name.length}:${name}|${display.length}:${display}`);
  }
  return parts.join("\n");
}

/**
 * Collapse members that would render identical default field lists.
 * Prefer `focus` within each duplicate group; preserve first-seen order of
 * distinct payloads. If `focus` is missing from `members` but shares a payload
 * with a retained member, swap that slot to `focus`. Only prepend `focus` when
 * it is absent *and* no retained member shares its display payload (transient
 * cap edge where focus was outside the sliced window).
 */
export function collapseIdenticalDisplayMembers<Row, Key>(
  members: readonly PlotDatum<Row, Key>[],
  focus: PlotDatum<Row, Key>,
): NonEmptyReadonlyArray<PlotDatum<Row, Key>> {
  if (members.length === 0) return [focus];

  const chosen = new Map<string, PlotDatum<Row, Key>>();
  const order: string[] = [];
  let focusInMembers = false;

  for (const member of members) {
    if (member === focus) focusInMembers = true;
    const token = tooltipDisplayPayloadToken(member.fields);
    const existing = chosen.get(token);
    if (existing === undefined) {
      chosen.set(token, member);
      order.push(token);
      continue;
    }
    // Prefer focus when it collides with a prior duplicate payload.
    if (member === focus) chosen.set(token, member);
  }

  const focusToken = tooltipDisplayPayloadToken(focus.fields);
  if (chosen.has(focusToken)) {
    // Same display as a retained member — always surface focus for styling.
    chosen.set(focusToken, focus);
  } else if (!focusInMembers) {
    // Focus was outside the member window (e.g. transient cap) and is distinct.
    // Replace the last capped slot rather than growing past members.length so
    // live-text counts and the default tooltip stay within the transient bound.
    chosen.set(focusToken, focus);
    order.unshift(focusToken);
    if (order.length > members.length) {
      const dropped = order.pop()!;
      if (dropped !== focusToken) chosen.delete(dropped);
    }
  }

  const first = chosen.get(order[0]!)!;
  const rest = order.slice(1).map((token) => chosen.get(token)!);
  return [first, ...rest];
}
