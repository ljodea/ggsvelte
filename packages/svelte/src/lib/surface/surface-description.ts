/**
 * Pure a11y description strings for the capture surface live region.
 * Host reads these into a construction-time `$derived` keyed on active tool.
 *
 * Callers must pass `inspectPinEnabled` only when `activeTool === "inspect"`
 * (or compute it lazily) so Svelte dependency tracking does not subscribe to
 * inspect config while another tool is active.
 */
import type { InteractionTool } from "../interaction/interaction.js";

export function buildSurfaceDescription(
  activeTool: InteractionTool,
  inspectPinEnabled: boolean,
): string {
  if (activeTool === "select-area")
    return "Press Enter or Space to set the first selection corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the selection. Press Escape to cancel.";
  if (activeTool === "zoom-area")
    return "Press Enter or Space to set the first zoom corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the zoom. Press Escape to cancel.";
  if (activeTool === "point")
    return "Use Arrow keys to inspect data. Press Enter or Space to toggle the focused point selection. Press Escape to dismiss.";
  return inspectPinEnabled
    ? "Use Arrow keys to inspect data. Press Enter or Space to pin. Press Escape to dismiss."
    : "Use Arrow keys to inspect data. Press Escape to dismiss.";
}
