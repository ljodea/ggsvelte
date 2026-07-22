/**
 * Normalize public interaction capability inputs into a resolved config with
 * diagnostics. Types live in ./interaction.ts; this module is pure logic only.
 */
import type {
  InteractionConfigInput,
  InteractionTool,
  ResolvedInteractionConfig,
} from "./interaction.js";
import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  type InteractionDiagnostic,
} from "./interaction-diagnostics.js";

export function normalizeInteractionConfig<Row, Key>(
  input: InteractionConfigInput<Row, Key>,
  context: { faceted?: boolean; hasKey?: boolean } = {},
): ResolvedInteractionConfig<Row, Key> {
  const diagnostics: InteractionDiagnostic[] = [];
  let inspect: ResolvedInteractionConfig<Row, Key>["inspect"] = null;
  if (input.inspect !== undefined && input.inspect !== false) {
    const value = input.inspect === true ? {} : input.inspect;
    const maxDistance = value.maxDistance ?? 24;
    if (!Number.isFinite(maxDistance) || maxDistance < 0) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INVALID_MAX_DISTANCE,
        actual: maxDistance,
      });
    } else {
      inspect = Object.freeze({
        mode: value.mode ?? "auto",
        pin: value.pin ?? true,
        maxDistance,
        contentMode: value.contentMode ?? "informational",
        ...(value.content !== undefined && { content: value.content }),
      });
    }
  }

  let select: ResolvedInteractionConfig["select"] = null;
  if (input.select !== undefined && input.select !== false) {
    const value = typeof input.select === "string" ? { type: input.select } : input.select;
    select = Object.freeze({
      type: value.type,
      mode: value.mode ?? "xy",
      multiple: value.multiple ?? false,
      persistent: value.persistent ?? true,
      preset: value.preset ?? "independent",
    });
    if (value.type === "point" && context.hasKey === false) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_POINT_REQUIRES_KEY,
      });
    }
    if (value.type === "interval" && select.preset !== "independent" && context.hasKey === false) {
      // Union combines stored record keys and cross-panel matches candidate
      // semantic keys: with keyless rows both silently select nothing
      // outside the origin rectangle.
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_PRESET_REQUIRES_KEY,
      });
    }
  }

  let zoom: ResolvedInteractionConfig["zoom"] = null;
  if (input.zoom !== undefined && input.zoom !== false) {
    const value = input.zoom === true ? {} : input.zoom;
    zoom = Object.freeze({
      mode: value.mode ?? "xy",
      trigger: value.trigger ?? "brush",
    });
  }

  let legendFocus: ResolvedInteractionConfig["legendFocus"] = null;
  if (input.legendFocus !== undefined && input.legendFocus !== false) {
    if (context.hasKey === false) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_LEGEND_REQUIRES_KEY,
      });
    } else {
      const value = input.legendFocus === true ? {} : input.legendFocus;
      legendFocus = Object.freeze({ preview: value.preview ?? true });
    }
  }

  if (context.faceted === true && zoom !== null) {
    diagnostics.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_FACET_UNSUPPORTED,
    });
    zoom = null;
  }

  const availableTools: InteractionTool[] = [];
  if (inspect !== null || select?.type === "interval" || zoom !== null)
    availableTools.push("inspect");
  if (select?.type === "point") availableTools.push("point");
  if (select?.type === "interval") availableTools.push("select-area");
  if (zoom !== null) availableTools.push("zoom-area");
  const fallbackTool = select?.type === "point" && inspect === null ? "point" : "inspect";
  const requestedTool = input.tool ?? fallbackTool;
  const initialTool = availableTools.includes(requestedTool) ? requestedTool : fallbackTool;
  if (input.tool !== undefined && !availableTools.includes(input.tool)) {
    diagnostics.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_TOOL_UNAVAILABLE,
      actual: input.tool,
    });
  }

  return Object.freeze({
    interactive: availableTools.length > 0 || legendFocus !== null,
    inspect,
    select,
    zoom,
    legendFocus,
    initialTool,
    availableTools: Object.freeze(availableTools),
    diagnostics: Object.freeze(diagnostics),
  });
}
