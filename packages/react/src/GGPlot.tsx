import { forwardRef, useMemo } from "react";

import type { GGPlotHandle, GGPlotProps } from "./plot-props.js";
import { PlotSurface } from "./plot-surface.js";
import { LayerRegistry, PlotRegistryContext } from "./registry.js";

import "./host-init.js";

function restWithoutChildren(props: GGPlotProps): Omit<GGPlotProps, "children" | "key"> {
  const { children: _children, ...rest } = props;
  void _children;
  const withoutKey = { ...rest };
  Reflect.deleteProperty(withoutKey, "key");
  return withoutKey;
}

function identityKeyFallback(props: object): GGPlotProps["key"] {
  return Reflect.get(props, "key") as GGPlotProps["key"];
}

export const GGPlot = forwardRef<GGPlotHandle, GGPlotProps>(function GGPlot(props, ref) {
  const registry = useMemo(() => new LayerRegistry(), []);
  const rest = restWithoutChildren(props);
  return (
    <PlotRegistryContext.Provider value={registry}>
      {props.children}
      <PlotSurface
        {...rest}
        identityKey={identityKeyFallback(props)}
        registry={registry}
        plotRef={ref}
      />
    </PlotRegistryContext.Provider>
  );
});
