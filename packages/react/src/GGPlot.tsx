import { forwardRef, useMemo } from "react";

import type { GGPlotHandle, GGPlotProps } from "./plot-props.js";
import { PlotSurface } from "./plot-surface.js";
import { LayerRegistry, PlotRegistryContext } from "./registry.js";

import "./host-init.js";

export const GGPlot = forwardRef<GGPlotHandle, GGPlotProps>(function GGPlot(props, ref) {
  const registry = useMemo(() => new LayerRegistry(), []);
  const { key: legacyKey, children, ...rest } = props;
  return (
    <PlotRegistryContext.Provider value={registry}>
      {children}
      <PlotSurface {...rest} identityKey={legacyKey} registry={registry} plotRef={ref} />
    </PlotRegistryContext.Provider>
  );
});
