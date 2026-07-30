<script lang="ts">
  /**
   * <GuideLegend> — declaration-only legend-guide layer for <GGPlot>
   * (#659 slice 6). Presentation of one aesthetic's legend: title, position,
   * direction, key size, collision, and the INTEGER placement rank `order`.
   *
   * Host interaction: `focus` opts this channel into discrete legend
   * preview/pin emphasis. It is NOT a PortableSpec field — stripped before
   * guideLegend() and registered as host layer kind `legendFocus`.
   * Focus-only children (no presentation options) do not force a guides
   * entry, so continuous colour scales keep their colorbar without a
   * guide-aesthetic-incompatible pipeline error.
   *
   * Not to be confused with <Legend order="sorted"/>, which is the plot-wide
   * entry-SORT enum (LegendSpec). Same word, unrelated concepts.
   * Emits NO markup.
   */
  import { guideLegend, type LegendGuideOptions } from "@ggsvelte/spec";

  import type { LegendFocusInput } from "../interaction/interaction.js";
  import {
    isLegendFocusPropEnabled,
    type LegendFocusLayerValue,
  } from "../legend/resolve-legend-focus.js";
  import {
    createPlotLayer,
    definedProps,
  } from "../layers/plot-layer.svelte.js";
  import {
    splitChannel,
    type NonPositionGuideChannel,
  } from "./factory.svelte.js";

  type Props = LegendGuideOptions & {
    channel: NonPositionGuideChannel;
    /**
     * Opt this channel into discrete legend preview, focus, and linked
     * emphasis. Host-only — never appears in PortableSpec.
     */
    focus?: LegendFocusInput;
  };

  const props: Props = $props();

  createPlotLayer("guides", () => {
    const defined = definedProps(props) as Props;
    const { focus: _focus, ...withoutFocus } = defined;
    const { channel, options } = splitChannel(withoutFocus);
    // Focus-only: do not force type:"legend" (breaks continuous ramps).
    if (
      Object.keys(options).length === 0 &&
      isLegendFocusPropEnabled(defined.focus)
    ) {
      return {};
    }
    return { [channel]: guideLegend(options) };
  });

  createPlotLayer("legendFocus", (): LegendFocusLayerValue => {
    const defined = definedProps(props) as Props;
    const focus = defined.focus;
    if (!isLegendFocusPropEnabled(focus)) return null;
    return {
      channel: defined.channel,
      input: focus === true ? true : focus,
    };
  });
</script>
