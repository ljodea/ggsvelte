/**
 * Channel and DataRef form classification for TypeBox 1.x error mapping.
 * Path/schema walk: validate-schema-walk.ts. SpecError mapping: validate-map-errors.ts.
 */
import type { TLocalizedValidationError } from "typebox/error";

import { isRecord, pathSegments, type UnionMemberInfo } from "./validate-schema-walk.js";

export const CHANNEL_FIX_EXAMPLE = { field: "column_name" };

/** Channel names that live under aes (plot- or layer-level). */
const AES_CHANNEL_KEYS = new Set([
  "x",
  "y",
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "group",
  "label",
  "weight",
  "ymin",
  "ymax",
]);

/** True only for the channel node itself (`…/aes/<channel>`), not nested paths. */
export function isChannelPath(path: string): boolean {
  const segs = pathSegments(path);
  if (segs.length < 2) return false;
  const i = segs.length - 2;
  return segs[i] === "aes" && AES_CHANNEL_KEYS.has(segs[i + 1]!);
}

/**
 * DataRef / InlineData union roots only: `/data` or `/datasets/<name>`.
 * Nested paths under a data container must keep their own diagnostics.
 */
export function isDataUnionPath(path: string): boolean {
  const segs = pathSegments(path);
  if (segs.length === 1 && segs[0] === "data") return true;
  if (segs.length === 2 && segs[0] === "datasets") return true;
  return false;
}

/** Canonical channel object form (or null); bare strings are handled separately. */
export function looksLikeChannelForm(v: unknown): boolean {
  if (v === null) return true;
  if (!isRecord(v)) return false;
  return "field" in v || "value" in v || "stat" in v;
}

/** Already a data container shape — do not suggest re-wrapping as `{ values: [...] }`. */
export function looksLikeDataContainer(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return "values" in v || "columns" in v || "name" in v;
}

export function isScalarValue(v: unknown): boolean {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/** Exclusive channel form discriminators (exactly one allowed per channel). */
const CHANNEL_DISCRIMINATORS = ["field", "value", "stat"] as const;
/** Exclusive data form discriminators (exactly one allowed per DataRef). */
const DATA_DISCRIMINATORS = ["values", "columns", "name"] as const;

/**
 * True when an additionalProperties failure lists a key that is *not* in
 * `ignoreKeys`. Used to ignore competing-branch noise (e.g. Columns rejecting
 * `values`) while still surfacing typos and form-illegal keys.
 */
export function additionalPropertyNames(
  group: readonly TLocalizedValidationError[],
  ignoreKeys: ReadonlySet<string> = new Set(),
): string[] {
  const names = new Set<string>();
  for (const error of group) {
    if (error.keyword !== "additionalProperties") continue;
    const listed = Array.isArray(error.params.additionalProperties)
      ? error.params.additionalProperties
      : [];
    for (const key of listed) {
      if (!ignoreKeys.has(key)) names.add(key);
    }
  }
  return [...names];
}

export function hasActionableAddlNoise(
  group: readonly TLocalizedValidationError[],
  ignoreKeys: ReadonlySet<string>,
): boolean {
  return additionalPropertyNames(group, ignoreKeys).length > 0;
}

export function channelDiscriminatorKeys(v: Record<string, unknown>): string[] {
  return CHANNEL_DISCRIMINATORS.filter((k) => k in v);
}

export function dataDiscriminatorKeys(
  v: Record<string, unknown>,
  allowed: readonly (typeof DATA_DISCRIMINATORS)[number][] = DATA_DISCRIMINATORS,
): string[] {
  return allowed.filter((k) => k in v);
}

export function dataDiscriminatorsForUnion(
  members: UnionMemberInfo,
  path: string,
): readonly (typeof DATA_DISCRIMINATORS)[number][] {
  const allowed: (typeof DATA_DISCRIMINATORS)[number][] = [];
  if (members.refs.some((ref) => ref.endsWith("DataValues"))) allowed.push("values");
  if (members.refs.some((ref) => ref.endsWith("DataColumns"))) allowed.push("columns");
  if (members.refs.some((ref) => ref.endsWith("DataName"))) allowed.push("name");
  if (allowed.length > 0) return allowed;
  return pathSegments(path)[0] === "datasets" ? ["values", "columns"] : DATA_DISCRIMINATORS;
}

/**
 * Keys legal on the single present channel form, or null when forms are mixed
 * / absent. FieldRef = {field}; ValueRef = {value, scale?}; StatRef = {stat}.
 */
export function allowedKeysForPresentChannelForm(v: Record<string, unknown>): Set<string> | null {
  const discs = channelDiscriminatorKeys(v);
  if (discs.length !== 1) return null;
  switch (discs[0]) {
    case "field":
      return new Set(["field"]);
    case "value":
      return new Set(["value", "scale"]);
    case "stat":
      return new Set(["stat"]);
    default:
      return null;
  }
}

/** Keys legal on the single present data form, or null when forms are mixed. */
export function allowedKeysForPresentDataForm(
  v: Record<string, unknown>,
  allowedDiscriminators: readonly (typeof DATA_DISCRIMINATORS)[number][],
): Set<string> | null {
  const discs = dataDiscriminatorKeys(v, allowedDiscriminators);
  if (discs.length !== 1) return null;
  return new Set([discs[0]!]);
}
