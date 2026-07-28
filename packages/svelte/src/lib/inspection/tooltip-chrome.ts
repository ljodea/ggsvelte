/**
 * Tooltip chrome policy for theme-aware default content (#1069).
 *
 * Visual roles (paper / ink / border) live on the theme. This helper decides
 * whether the default instructional footer ("Click to pin", overflow pin hint)
 * belongs with that chrome — flat (gridless) themes drop to text on paper and
 * stay silent; pinned-disabled inspect configs never advertise pinning.
 */

export type TooltipPinHintInput = {
  /** Whether inspect pinning is enabled on the plot. */
  readonly pin: boolean;
  /**
   * Resolved theme tooltip keyline. Gridless themes derive `"transparent"`;
   * a concrete color means the theme still wants a boxed panel.
   */
  readonly tooltipBorder: string;
};

/** True when the default tooltip should show pin-related instructional footers. */
export function shouldShowTooltipPinHint(input: TooltipPinHintInput): boolean {
  if (!input.pin) return false;
  const border = input.tooltipBorder.trim().toLowerCase();
  if (border === "transparent" || border === "none") return false;
  return true;
}
