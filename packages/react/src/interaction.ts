import type { CellValue } from "@ggsvelte/core";
import type { ReactNode } from "react";

export type InteractionSource = "pointer" | "keyboard" | "touch" | "programmatic";
export type InspectMode = "auto" | "exact" | "x" | "y" | "xy";
export type AreaMode = "x" | "y" | "xy";
export type InteractionTool = "inspect" | "point" | "select-area" | "zoom-area";

export interface TooltipField {
  readonly channel: string;
  readonly field: string;
  readonly value: CellValue;
}

export interface PlotDatum<Row, Key> {
  readonly key: Key | null;
  readonly row: Row | null;
  readonly sourceKeys: ReadonlyArray<Key>;
  readonly lineageCount: number;
  readonly layerIndex: number;
  readonly panelId: string | null;
  readonly fields: ReadonlyArray<TooltipField>;
  readonly anchor: Readonly<{ x: number; y: number }>;
}

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export interface PlotInspectionChange<Row, Key> {
  readonly type: "inspect";
  readonly phase: "change";
  readonly state: "transient" | "pinned";
  readonly source: InteractionSource;
  readonly panelId: string | null;
  readonly focus: PlotDatum<Row, Key>;
  readonly members: NonEmptyReadonlyArray<PlotDatum<Row, Key>>;
  readonly mode: InspectMode;
}

export interface PlotInspectionClear {
  readonly type: "inspect";
  readonly phase: "clear";
  readonly source: InteractionSource;
}

export type PlotInspection<Row, Key = PropertyKey> =
  | PlotInspectionChange<Row, Key>
  | PlotInspectionClear;

export interface PointSelection<Key = PropertyKey> {
  readonly type: "select";
  readonly phase: "end" | "clear";
  readonly mode: "point";
  readonly keys: ReadonlyArray<Key>;
  readonly source: InteractionSource;
}

export type PlotSelection<Key = PropertyKey> = PointSelection<Key>;

export type ZoomDomains = { x?: [number, number]; y?: [number, number] };
export type ReadonlyZoomDomains = {
  readonly x?: readonly [number, number];
  readonly y?: readonly [number, number];
};

export interface ZoomEvent {
  readonly type: "zoom";
  readonly phase: "end" | "clear";
  readonly source: InteractionSource;
  readonly domains: ReadonlyZoomDomains | null;
}

export type PlotInteractionEvent<Row, Key = PropertyKey> =
  | PlotInspection<Row, Key>
  | PlotSelection<Key>
  | ZoomEvent;

export interface InspectOptions<Row = Record<string, CellValue>, Key = PropertyKey> {
  readonly mode?: InspectMode;
  readonly pin?: boolean;
  readonly maxDistance?: number;
  readonly identity?: Key | ((row: Row, index: number) => Key);
  readonly content?: (inspection: PlotInspectionChange<Row, Key>) => ReactNode;
}

export interface SelectOptions {
  readonly type: "point" | "interval";
  readonly mode?: AreaMode;
  readonly multiple?: boolean;
  readonly identity?:
    | PropertyKey
    | ((row: Record<string, CellValue>, index: number) => PropertyKey);
}

export interface ZoomOptions {
  readonly mode?: AreaMode;
  readonly trigger?: "brush";
}

export type InspectInput<Row = Record<string, CellValue>, Key = PropertyKey> =
  | boolean
  | InspectOptions<Row, Key>;
export type SelectInput = false | "point" | "interval" | SelectOptions;
export type ZoomInput = boolean | ZoomOptions;

export interface PlotInteractionScope {
  readonly keys: string;
  readonly x?: string;
  readonly y?: string;
  readonly intervals?: string;
}

export type PlotInteractionChange = "selection" | "emphasis" | "interval" | "zoom";

export interface PlotInteractionSnapshot<Key = PropertyKey> {
  readonly revision: number;
  readonly selections: ReadonlyArray<{ readonly scope: string; readonly keys: ReadonlyArray<Key> }>;
  readonly emphases: ReadonlyArray<{ readonly scope: string; readonly keys: ReadonlyArray<Key> }>;
  readonly intervals: ReadonlyArray<unknown>;
  readonly zoom: {
    readonly x: ReadonlyArray<unknown>;
    readonly y: ReadonlyArray<unknown>;
  };
}

export interface PlotInteractionTransition<Key = PropertyKey> {
  readonly revision: number;
  readonly kind: string;
  readonly changes: ReadonlyArray<PlotInteractionChange>;
  readonly source: InteractionSource;
  readonly scope: PlotInteractionScope;
  readonly snapshot: PlotInteractionSnapshot<Key>;
}

export interface PlotInteractionMutationOptions {
  readonly scope: string | PlotInteractionScope;
  readonly source?: InteractionSource;
}

export interface PlotInteractionZoomOptions {
  readonly scope: PlotInteractionScope;
  readonly source?: InteractionSource;
}

export type ControllerDatumIdentity<Key extends PropertyKey> =
  | PropertyKey
  | ((row: Record<string, CellValue>, index: number) => Key);

export interface CreatePlotInteractionOptions<Key extends PropertyKey = PropertyKey> {
  readonly onchange?: (transition: PlotInteractionTransition<Key>) => void;
  readonly identity?: ControllerDatumIdentity<Key>;
}

export interface PlotInteractionController<Key extends PropertyKey = PropertyKey> {
  readonly revision: number;
  readonly snapshot: PlotInteractionSnapshot<Key>;
  readonly identity?: ControllerDatumIdentity<Key>;
  subscribe(listener: () => void): () => void;
  selected(scope: string | PlotInteractionScope): ReadonlyArray<Key>;
  setSelection(
    keys: ReadonlyArray<Key>,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
  clearSelection(options: PlotInteractionMutationOptions): PlotInteractionTransition<Key> | null;
  zoom(scope: PlotInteractionScope): ReadonlyZoomDomains;
  setZoom(
    domains: ReadonlyZoomDomains,
    options: PlotInteractionZoomOptions,
  ): PlotInteractionTransition<Key> | null;
  resetZoom(options: PlotInteractionZoomOptions): PlotInteractionTransition<Key> | null;
}

const EMPTY_KEYS = Object.freeze([]) as readonly never[];

function keyScope(scope: string | PlotInteractionScope): string {
  return typeof scope === "string" ? scope : scope.keys;
}

export function createPlotInteraction<Key extends PropertyKey = PropertyKey>(
  options: CreatePlotInteractionOptions<Key> = {},
): PlotInteractionController<Key> {
  let revision = 0;
  const selections = new Map<string, ReadonlyArray<Key>>();
  const zoomX = new Map<string, readonly [number, number]>();
  const zoomY = new Map<string, readonly [number, number]>();
  const listeners = new Set<() => void>();

  const emit = (): void => {
    for (const listener of listeners) listener();
  };

  const currentSnapshot = (): PlotInteractionSnapshot<Key> =>
    Object.freeze({
      revision,
      selections: [...selections.entries()].map(([scope, keys]) => ({ scope, keys })),
      emphases: [],
      intervals: [],
      zoom: Object.freeze({
        x: [...zoomX.entries()].map(([scope, domain]) => ({ scope, domain })),
        y: [...zoomY.entries()].map(([scope, domain]) => ({ scope, domain })),
      }),
    });

  const commit = (
    kind: string,
    changes: ReadonlyArray<PlotInteractionChange>,
    scope: PlotInteractionScope,
    source: InteractionSource,
  ): PlotInteractionTransition<Key> => {
    revision += 1;
    const transition = Object.freeze({
      revision,
      kind,
      changes,
      source,
      scope,
      snapshot: currentSnapshot(),
    });
    options.onchange?.(transition);
    emit();
    return transition;
  };

  const controller: PlotInteractionController<Key> = {
    get revision() {
      return revision;
    },
    get snapshot() {
      return currentSnapshot();
    },
    ...(options.identity !== undefined && { identity: options.identity }),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    selected(scope) {
      return selections.get(keyScope(scope)) ?? EMPTY_KEYS;
    },
    setSelection(keys, mutation) {
      const scopeKey = keyScope(mutation.scope);
      selections.set(scopeKey, Object.freeze([...keys]));
      return commit(
        "selection",
        ["selection"],
        typeof mutation.scope === "string" ? { keys: mutation.scope } : mutation.scope,
        mutation.source ?? "programmatic",
      );
    },
    clearSelection(mutation) {
      return controller.setSelection([], mutation);
    },
    zoom(inputScope) {
      const x = inputScope.x === undefined ? undefined : zoomX.get(inputScope.x);
      const y = inputScope.y === undefined ? undefined : zoomY.get(inputScope.y);
      return Object.freeze({
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      });
    },
    setZoom(domains, mutation) {
      if (mutation.scope.x !== undefined && domains.x !== undefined) {
        zoomX.set(mutation.scope.x, domains.x);
      }
      if (mutation.scope.y !== undefined && domains.y !== undefined) {
        zoomY.set(mutation.scope.y, domains.y);
      }
      return commit("zoom", ["zoom"], mutation.scope, mutation.source ?? "programmatic");
    },
    resetZoom(mutation) {
      if (mutation.scope.x !== undefined) zoomX.delete(mutation.scope.x);
      if (mutation.scope.y !== undefined) zoomY.delete(mutation.scope.y);
      return commit("zoom", ["zoom"], mutation.scope, mutation.source ?? "programmatic");
    },
  };
  return Object.freeze(controller);
}
