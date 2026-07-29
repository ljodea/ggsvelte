/**
 * Shared helpers for layer structural grammar checks.
 */
import type { SpecError } from "./errors.js";
import type { ChannelName } from "./schema.js";

/** Same shape as sibling validate-structure-* modules (local, not schema-walk). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export const CHANNEL_FIX_EXAMPLE = { field: "column_name" };

export function pushMissingChannel(
  errors: SpecError[],
  layerPath: string,
  channel: ChannelName,
  message: string,
): void {
  errors.push({
    code: "missing-required-channel",
    path: `${layerPath}/aes/${channel}`,
    message,
    fix: {
      description: `Map "${channel}" to a data field.`,
      example: { [channel]: CHANNEL_FIX_EXAMPLE },
    },
  });
}
