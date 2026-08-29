import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { resolveInteractionScope } from "@ggsvelte/compose";
import type { RenderModel, ScaleState } from "@ggsvelte/core";
import { planStrata, runPipeline } from "@ggsvelte/core";
import type { LiveSvgHandle } from "@ggsvelte/core/svg-live";
import type { PortableSpec } from "@ggsvelte/spec";

import type { PlotInspectionChange, ZoomDomains } from "./interaction.js";
import { assembleFromProps } from "./plot-assemble.js";
import { hostDatumKey, inspectMaxDistance } from "./plot-host-identity.js";
import { clientRectOf, hitAt, inspectionFromHit, zoomFromBrush } from "./plot-pointer.js";
import type { GGPlotHandle, GGPlotProps } from "./plot-props.js";
import { applyZoom, numericDomain } from "./plot-zoom.js";
import type { LayerRegistry } from "./registry.js";
import { applyAriaLabel, destroyAllLives, syncStrata, withChromeSvg } from "./strata-sync.js";

const DEFAULT_HEIGHT = 400;

function isContainerWidth(
  width: number | "container" | undefined,
): width is "container" | undefined {
  return width === undefined || width === "container";
}

function subscribeNone(): () => void {
  return () => {};
}

function readRevision(controller: GGPlotProps["interaction"]): number {
  return controller?.revision ?? 0;
}

function disposePlot(
  lives: Map<number, LiveSvgHandle>,
  modelRef: { current: RenderModel | null },
): void {
  destroyAllLives(lives);
  modelRef.current?.dispose();
  modelRef.current = null;
}

function plotTools(props: GGPlotProps, registry: LayerRegistry) {
  return {
    inspect:
      props.tool === "inspect" ||
      props.inspect === true ||
      typeof props.inspect === "object" ||
      registry.capabilities("inspect")[0] !== undefined,
    select: props.tool === "point" || (props.select !== false && props.select !== undefined),
    zoom: props.tool === "zoom-area" || props.zoom === true || typeof props.zoom === "object",
  };
}

export function PlotSurface(
  props: Omit<GGPlotProps, "key" | "children"> & {
    identityKey?: GGPlotProps["key"];
    registry: LayerRegistry;
    plotRef: React.ForwardedRef<GGPlotHandle>;
  },
) {
  const { registry, plotRef, identityKey } = props;
  useSyncExternalStore(
    (onStoreChange) => registry.subscribe(onStoreChange),
    () => registry.getSnapshot(),
    () => registry.getSnapshot(),
  );
  const interactionRevision = useSyncExternalStore(
    (onStoreChange) => {
      if (props.interaction === undefined) return subscribeNone();
      return props.interaction.subscribe(onStoreChange);
    },
    () => readRevision(props.interaction),
    () => readRevision(props.interaction),
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const livesRef = useRef(new Map<number, LiveSvgHandle>());
  const modelRef = useRef<RenderModel | null>(null);
  const prevScalesRef = useRef<Record<string, ScaleState> | null>(null);
  const assembledRef = useRef<PortableSpec | null>(null);
  const onrenderRef = useRef(props.onrender);
  onrenderRef.current = props.onrender;
  const brushOrigin = useRef<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(480);
  const [zoomDomains, setZoomDomains] = useState<Partial<ZoomDomains> | null>(null);
  const [inspection, setInspection] = useState<PlotInspectionChange<
    Record<string, unknown>,
    PropertyKey
  > | null>(null);

  const resolvedWidth: number = isContainerWidth(props.width) ? containerWidth : props.width;
  const resolvedHeight = props.height ?? DEFAULT_HEIGHT;

  useEffect(() => {
    if (!isContainerWidth(props.width) || rootRef.current === null) {
      return () => {};
    }
    const el = rootRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined && w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setContainerWidth(initial);
    return () => {
      ro.disconnect();
    };
  }, [props.width]);

  const assembled = useMemo(
    () => assembleFromProps(props, registry),
    [props.spec, props.data, props.aes, props.layers, props.a11y, registry.getSnapshot()],
  );
  assembledRef.current = assembled;
  const runSpec = assembled === null ? null : applyZoom(assembled, zoomDomains);

  const paint = useCallback(
    (spec: PortableSpec) => {
      const stack = stackRef.current;
      if (stack === null) return;
      const model = runPipeline(spec, {
        width: resolvedWidth,
        height: resolvedHeight,
        ...(prevScalesRef.current !== null && { prevScales: prevScalesRef.current }),
      });
      modelRef.current?.dispose();
      modelRef.current = model;
      prevScalesRef.current = model.scales.state;
      syncStrata(
        stack,
        model.scene,
        withChromeSvg(planStrata(model.scene, model.layerBackends)),
        livesRef.current,
      );
      applyAriaLabel(stack, props.ariaLabel);
      onrenderRef.current?.(model, spec);
    },
    [props.ariaLabel, resolvedHeight, resolvedWidth],
  );

  useEffect(() => {
    if (runSpec === null) {
      disposePlot(livesRef.current, modelRef);
      return;
    }
    paint(runSpec);
  }, [paint, runSpec]);

  useEffect(() => {
    return () => {
      disposePlot(livesRef.current, modelRef);
    };
  }, []);

  useEffect(() => {
    const controller = props.interaction;
    const scope = props.interactionScope;
    if (controller === undefined || scope === undefined) return;
    if (scope.x === undefined && scope.y === undefined) return;
    const next = controller.zoom(scope);
    const x = numericDomain(next.x);
    const y = numericDomain(next.y);
    if (x === undefined && y === undefined) {
      setZoomDomains(null);
      return;
    }
    setZoomDomains({
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
    });
  }, [interactionRevision, props.interaction, props.interactionScope]);

  const tools = plotTools(props, registry);
  const maxDistance = inspectMaxDistance(props, registry);
  const datumKey = hostDatumKey(props, registry, identityKey, assembled?.data);
  const interactionScope = resolveInteractionScope({
    interaction: props.interaction,
    ...(props.interactionScope !== undefined && { interactionScope: props.interactionScope }),
    zoom: props.zoom ?? tools.zoom,
    assembled,
    datumKey,
  });

  useImperativeHandle(plotRef, () => ({
    resetScales() {
      prevScalesRef.current = null;
      setZoomDomains(null);
      const spec = assembledRef.current;
      if (spec !== null) paint(spec);
    },
    setZoom(domains) {
      setZoomDomains((prev) => ({ ...prev, ...domains }));
      props.interaction?.setZoom(domains, {
        scope: interactionScope,
        source: "programmatic",
      });
      if (domains.x !== undefined || domains.y !== undefined) {
        props.onzoom?.({
          type: "zoom",
          phase: "end",
          source: "programmatic",
          domains,
        });
      }
    },
  }));

  const locateHit = (event: React.PointerEvent<HTMLDivElement>) =>
    hitAt(event, modelRef.current, clientRectOf(rootRef.current), datumKey, maxDistance);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!tools.inspect) return;
    const found = locateHit(event);
    if (found === null) {
      setInspection(null);
      return;
    }
    const next = inspectionFromHit(event, found);
    setInspection(next);
    props.oninspect?.(next as never);
    props.oninteraction?.(next as never);
  };

  const onPointerLeave = () => {
    brushOrigin.current = null;
    if (inspection === null) return;
    const clear = { type: "inspect" as const, phase: "clear" as const, source: "pointer" as const };
    setInspection(null);
    props.oninspect?.(clear);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const model = modelRef.current;
    const rect = clientRectOf(rootRef.current);
    if (model !== null && rect !== null) {
      brushOrigin.current = model.viewport.locate(event.clientX, event.clientY, rect);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = brushOrigin.current;
    brushOrigin.current = null;
    const model = modelRef.current;
    const rect = clientRectOf(rootRef.current);
    if (model === null || rect === null) return;
    const end = model.viewport.locate(event.clientX, event.clientY, rect);
    const start = origin ?? end;
    const dragged = Math.hypot(end.x - start.x, end.y - start.y) >= 8;
    if (tools.zoom && dragged) {
      const domains = zoomFromBrush(model, start, end);
      if (domains === null) return;
      setZoomDomains((prev) => ({ ...prev, ...domains }));
      props.interaction?.setZoom(domains, { scope: interactionScope, source: "pointer" });
      props.onzoom?.({ type: "zoom", phase: "end", source: "pointer", domains });
      props.oninteraction?.({ type: "zoom", phase: "end", source: "pointer", domains });
      return;
    }
    if (!tools.select) return;
    const found = locateHit(event);
    if (found === null) return;
    const selection = {
      type: "select" as const,
      phase: "end" as const,
      mode: "point" as const,
      keys: [found.key],
      source: "pointer" as const,
    };
    props.onselect?.(selection);
    props.interaction?.setSelection([found.key], { scope: interactionScope, source: "pointer" });
    props.oninteraction?.(selection);
  };

  const ready = runSpec !== null;
  const tooltip = inspection !== null;

  return (
    <div
      ref={rootRef}
      className={`gg-plot-root${isContainerWidth(props.width) ? " gg-container-width" : ""}`}
      data-gg-ready={ready ? "true" : "false"}
      aria-label={props.ariaLabel}
      style={{
        position: "relative",
        width: isContainerWidth(props.width) ? "100%" : resolvedWidth,
        height: resolvedHeight,
      }}
    >
      <div
        ref={stackRef}
        className="gg-stratum-stack"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
      <div
        className="gg-capture"
        style={{ position: "absolute", inset: 0 }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      {tooltip ? (
        <div
          className="gg-tooltip"
          role="tooltip"
          style={{
            position: "absolute",
            left: inspection.focus.anchor.x + 8,
            top: inspection.focus.anchor.y + 8,
            pointerEvents: "none",
          }}
        >
          {inspection.focus.key === null ? "tooltip" : String(inspection.focus.key)}
        </div>
      ) : null}
    </div>
  );
}
