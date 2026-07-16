import type {
  InteractionSource,
  PlotInteractionChange,
  PlotInteractionInterval,
  PlotInteractionScope,
  PlotInteractionSnapshot,
  PlotInteractionTransition,
  ReadonlyIntervalDomains,
  ReadonlyZoomDomains,
  ScopedInteractionInterval,
  ScopedInteractionDomain,
  ScopedInteractionKeys,
} from "./interaction.js";

type KeyScope = string | PlotInteractionScope;

export interface PlotInteractionMutationOptions {
  readonly scope: KeyScope;
  readonly source?: InteractionSource;
}

export interface PlotInteractionZoomOptions {
  readonly scope: PlotInteractionScope;
  readonly source?: InteractionSource;
}

export interface CreatePlotInteractionOptions<Key extends PropertyKey> {
  readonly onchange?: (transition: PlotInteractionTransition<Key>) => void;
}

export interface PlotInteractionController<Key extends PropertyKey> {
  readonly revision: number;
  readonly snapshot: PlotInteractionSnapshot<Key>;
  selected(scope: KeyScope): ReadonlyArray<Key>;
  emphasized(scope: KeyScope): ReadonlyArray<Key>;
  isSelected(key: Key, scope: KeyScope): boolean;
  setSelection(
    keys: ReadonlyArray<Key>,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
  toggleSelection(
    key: Key,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
  clearSelection(options: PlotInteractionMutationOptions): PlotInteractionTransition<Key> | null;
  setEmphasis(
    keys: ReadonlyArray<Key>,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
  clearEmphasis(options: PlotInteractionMutationOptions): PlotInteractionTransition<Key> | null;
  intervals(scope: KeyScope): ReadonlyArray<ScopedInteractionInterval<Key>>;
  setInterval(
    interval: PlotInteractionInterval<Key>,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
  clearInterval(
    panelId: string,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
  clearIntervals(options: PlotInteractionMutationOptions): PlotInteractionTransition<Key> | null;
  zoom(scope: PlotInteractionScope): ReadonlyZoomDomains;
  setZoom(
    domains: ReadonlyZoomDomains,
    options: PlotInteractionZoomOptions,
  ): PlotInteractionTransition<Key> | null;
  resetZoom(options: PlotInteractionZoomOptions): PlotInteractionTransition<Key> | null;
  reconcileKeys(
    validKeys: ReadonlyArray<Key>,
    options: PlotInteractionMutationOptions,
  ): PlotInteractionTransition<Key> | null;
}

const EMPTY_KEYS = Object.freeze([]) as readonly never[];

function assertScope(value: string, channel: string): void {
  if (value.length === 0)
    throw new TypeError(`Interaction ${channel} scope must be a non-empty string.`);
}

function normalizedScope(scope: KeyScope): PlotInteractionScope {
  const value = typeof scope === "string" ? { keys: scope } : scope;
  assertScope(value.keys, "keys");
  if (value.x !== undefined) assertScope(value.x, "x");
  if (value.y !== undefined) assertScope(value.y, "y");
  if (value.intervals !== undefined) assertScope(value.intervals, "intervals");
  return Object.freeze({
    keys: value.keys,
    ...(value.x !== undefined && { x: value.x }),
    ...(value.y !== undefined && { y: value.y }),
    ...(value.intervals !== undefined && { intervals: value.intervals }),
  });
}

function keyScope(scope: KeyScope): string {
  return normalizedScope(scope).keys;
}

function assertKey(value: unknown): asserts value is PropertyKey {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "symbol")
    throw new TypeError("Interaction keys must be strings, numbers, or symbols.");
}

function keyRank(value: PropertyKey): number {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

function compareKeys(a: PropertyKey, b: PropertyKey): number {
  const rankDelta = keyRank(a) - keyRank(b);
  if (rankDelta !== 0) return rankDelta;
  if (typeof a === "number" && typeof b === "number") {
    if (Object.is(a, b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a - b;
  }
  const left = typeof a === "symbol" ? (Symbol.keyFor(a) ?? a.description ?? "") : String(a);
  const right = typeof b === "symbol" ? (Symbol.keyFor(b) ?? b.description ?? "") : String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalKeys<Key extends PropertyKey>(keys: ReadonlyArray<Key>): ReadonlyArray<Key> {
  for (const key of keys) assertKey(key);
  return Object.freeze([...new Set(keys)].toSorted(compareKeys));
}

function equalKeys<Key extends PropertyKey>(
  left: ReadonlyArray<Key>,
  right: ReadonlyArray<Key>,
): boolean {
  if (left.length !== right.length) return false;
  const values = new Set(right);
  return left.every((key) => values.has(key));
}

function canonicalDomain(domain: readonly [number, number]): readonly [number, number] {
  const [first, second] = domain;
  if (!Number.isFinite(first) || !Number.isFinite(second))
    throw new TypeError("Interaction zoom domains must contain two finite numbers.");
  return Object.freeze(first <= second ? [first, second] : [second, first]);
}

function canonicalIntervalAxis(axis: ReadonlyIntervalDomains["x"]): ReadonlyIntervalDomains["x"] {
  if (axis === undefined) return undefined;
  if (axis.kind === "band") {
    if (!Array.isArray(axis.values) || axis.values.length === 0)
      throw new TypeError("Interaction band intervals must contain at least one encoded value.");
    for (const value of axis.values) {
      if (typeof value !== "string")
        throw new TypeError("Interaction band interval values must be encoded strings.");
    }
    return Object.freeze({ kind: "band", values: Object.freeze([...new Set(axis.values)]) });
  }
  const domain = canonicalDomain(axis.domain);
  if (axis.kind === "log" && domain[0] <= 0)
    throw new TypeError("Interaction log interval domains must contain positive values.");
  return Object.freeze({ kind: axis.kind, domain });
}

function canonicalIntervalDomains(domains: ReadonlyIntervalDomains): ReadonlyIntervalDomains {
  const x = canonicalIntervalAxis(domains.x);
  const y = canonicalIntervalAxis(domains.y);
  if (x === undefined && y === undefined)
    throw new TypeError("Interaction intervals must contain an x or y domain.");
  return Object.freeze({ ...(x !== undefined && { x }), ...(y !== undefined && { y }) });
}

function equalIntervalAxis(
  left: ReadonlyIntervalDomains["x"],
  right: ReadonlyIntervalDomains["x"],
): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined || left.kind !== right.kind) return false;
  if (left.kind === "band" && right.kind === "band") {
    return (
      left.values.length === right.values.length &&
      left.values.every((value, index) => value === right.values[index])
    );
  }
  if (left.kind === "band" || right.kind === "band") return false;
  return equalDomain(left.domain, right.domain);
}

function equalInterval<Key extends PropertyKey>(
  left: ScopedInteractionInterval<Key> | undefined,
  right: ScopedInteractionInterval<Key>,
): boolean {
  return (
    left !== undefined &&
    left.panelId === right.panelId &&
    left.preset === right.preset &&
    equalIntervalAxis(left.domains.x, right.domains.x) &&
    equalIntervalAxis(left.domains.y, right.domains.y) &&
    equalKeys(left.keys, right.keys)
  );
}

function equalDomain(
  left: readonly [number, number] | undefined,
  right: readonly [number, number] | undefined,
): boolean {
  return (
    left === right ||
    (left !== undefined &&
      right !== undefined &&
      Object.is(left[0], right[0]) &&
      Object.is(left[1], right[1]))
  );
}

function sortedScopes<T>(values: Map<string, T>): Array<[string, T]> {
  return [...values].toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

/** Create chart-independent, semantic interaction state for Svelte 5.
 *
 * The controller owns stable keys and scoped data domains only. A chart is
 * responsible for translating those semantics to its current render model;
 * passive consumption must never publish the state back to the controller.
 */
export function createPlotInteraction<Key extends PropertyKey = PropertyKey>(
  options: CreatePlotInteractionOptions<Key> = {},
): PlotInteractionController<Key> {
  let revision = $state(0);
  const selections = new Map<string, ReadonlyArray<Key>>();
  const emphases = new Map<string, ReadonlyArray<Key>>();
  const intervals = new Map<string, Map<string, ScopedInteractionInterval<Key>>>();
  const zoomX = new Map<string, readonly [number, number]>();
  const zoomY = new Map<string, readonly [number, number]>();
  let notifying = false;

  const assertMutationAllowed = (): void => {
    if (notifying)
      throw new TypeError(
        "PlotInteractionController must not be mutated from its onchange callback. Schedule a later application update instead.",
      );
  };

  const scopedKeys = (
    values: Map<string, ReadonlyArray<Key>>,
  ): ReadonlyArray<ScopedInteractionKeys<Key>> =>
    Object.freeze(sortedScopes(values).map(([scope, keys]) => Object.freeze({ scope, keys })));

  const scopedDomains = (
    values: Map<string, readonly [number, number]>,
  ): ReadonlyArray<ScopedInteractionDomain> =>
    Object.freeze(sortedScopes(values).map(([scope, domain]) => Object.freeze({ scope, domain })));

  const scopedIntervals = (): ReadonlyArray<ScopedInteractionInterval<Key>> =>
    Object.freeze(
      sortedScopes(intervals).flatMap(([, panels]) =>
        sortedScopes(panels).map(([, interval]) => interval),
      ),
    );

  const currentSnapshot = (): PlotInteractionSnapshot<Key> =>
    Object.freeze({
      revision,
      selections: scopedKeys(selections),
      emphases: scopedKeys(emphases),
      intervals: scopedIntervals(),
      zoom: Object.freeze({
        x: scopedDomains(zoomX),
        y: scopedDomains(zoomY),
      }),
    });

  const commit = (
    kind: PlotInteractionTransition<Key>["kind"],
    changes: ReadonlyArray<PlotInteractionChange>,
    scope: PlotInteractionScope,
    source: InteractionSource,
  ): PlotInteractionTransition<Key> => {
    revision += 1;
    const transition = Object.freeze({
      revision,
      kind,
      changes: Object.freeze([...changes]),
      source,
      scope,
      snapshot: currentSnapshot(),
    });
    if (options.onchange !== undefined) {
      notifying = true;
      try {
        options.onchange(transition);
      } finally {
        notifying = false;
      }
    }
    return transition;
  };

  const replaceKeys = (
    values: Map<string, ReadonlyArray<Key>>,
    nextKeys: ReadonlyArray<Key>,
    mutation: PlotInteractionMutationOptions,
    kind: "selection" | "emphasis",
  ): PlotInteractionTransition<Key> | null => {
    const scope = normalizedScope(mutation.scope);
    const next = canonicalKeys(nextKeys);
    const prior = values.get(scope.keys) ?? EMPTY_KEYS;
    if (equalKeys(prior, next)) return null;
    if (next.length === 0) values.delete(scope.keys);
    else values.set(scope.keys, next);
    return commit(kind, [kind], scope, mutation.source ?? "programmatic");
  };

  const controller: PlotInteractionController<Key> = {
    get revision() {
      return revision;
    },
    get snapshot() {
      return currentSnapshot();
    },
    selected(scope) {
      void revision;
      return selections.get(keyScope(scope)) ?? EMPTY_KEYS;
    },
    emphasized(scope) {
      void revision;
      return emphases.get(keyScope(scope)) ?? EMPTY_KEYS;
    },
    isSelected(key, scope) {
      assertKey(key);
      return controller.selected(scope).includes(key);
    },
    setSelection(keys, mutation) {
      assertMutationAllowed();
      return replaceKeys(selections, keys, mutation, "selection");
    },
    toggleSelection(key, mutation) {
      assertKey(key);
      const current = controller.selected(mutation.scope);
      return controller.setSelection(
        current.includes(key)
          ? current.filter((value) => value !== key && !(Number.isNaN(value) && Number.isNaN(key)))
          : [...current, key],
        mutation,
      );
    },
    clearSelection(mutation) {
      return controller.setSelection([], mutation);
    },
    setEmphasis(keys, mutation) {
      assertMutationAllowed();
      return replaceKeys(emphases, keys, mutation, "emphasis");
    },
    clearEmphasis(mutation) {
      return controller.setEmphasis([], mutation);
    },
    intervals(inputScope) {
      void revision;
      const scope = normalizedScope(inputScope);
      const intervalScope = scope.intervals ?? scope.keys;
      const panels = intervals.get(intervalScope);
      if (panels === undefined) return EMPTY_KEYS;
      return Object.freeze(sortedScopes(panels).map(([, interval]) => interval));
    },
    setInterval(input, mutation) {
      assertMutationAllowed();
      const scope = normalizedScope(mutation.scope);
      const intervalScope = scope.intervals ?? scope.keys;
      assertScope(input.panelId, "interval panel");
      if (
        input.preset !== "independent" &&
        input.preset !== "union" &&
        input.preset !== "cross-panel"
      )
        throw new TypeError(
          "Interaction interval preset must be independent, union, or cross-panel.",
        );
      const next = Object.freeze({
        scope: intervalScope,
        panelId: input.panelId,
        preset: input.preset,
        domains: canonicalIntervalDomains(input.domains),
        keys: canonicalKeys(input.keys),
      });
      const priorPanels = intervals.get(intervalScope);
      const priorPreset = priorPanels?.values().next().value?.preset;
      const replacesScope =
        priorPanels !== undefined &&
        priorPreset !== undefined &&
        (priorPreset !== next.preset ||
          (next.preset === "cross-panel" &&
            (priorPanels.size !== 1 || !priorPanels.has(next.panelId))));
      const prior = replacesScope ? undefined : priorPanels?.get(next.panelId);
      if (!replacesScope && equalInterval(prior, next)) return null;
      const panels =
        replacesScope || priorPanels === undefined
          ? new Map<string, ScopedInteractionInterval<Key>>()
          : priorPanels;
      panels.set(next.panelId, next);
      intervals.set(intervalScope, panels);
      return commit("interval", ["interval"], scope, mutation.source ?? "programmatic");
    },
    clearInterval(panelId, mutation) {
      assertMutationAllowed();
      const scope = normalizedScope(mutation.scope);
      const intervalScope = scope.intervals ?? scope.keys;
      assertScope(panelId, "interval panel");
      const panels = intervals.get(intervalScope);
      if (panels === undefined || !panels.has(panelId)) return null;
      panels.delete(panelId);
      if (panels.size === 0) intervals.delete(intervalScope);
      return commit("interval", ["interval"], scope, mutation.source ?? "programmatic");
    },
    clearIntervals(mutation) {
      assertMutationAllowed();
      const scope = normalizedScope(mutation.scope);
      const intervalScope = scope.intervals ?? scope.keys;
      if (!intervals.delete(intervalScope)) return null;
      return commit("interval", ["interval"], scope, mutation.source ?? "programmatic");
    },
    zoom(inputScope) {
      void revision;
      const scope = normalizedScope(inputScope);
      const x = scope.x === undefined ? undefined : zoomX.get(scope.x);
      const y = scope.y === undefined ? undefined : zoomY.get(scope.y);
      return Object.freeze({
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      });
    },
    setZoom(domains, mutation) {
      assertMutationAllowed();
      const scope = normalizedScope(mutation.scope);
      const x = domains.x === undefined ? undefined : canonicalDomain(domains.x);
      const y = domains.y === undefined ? undefined : canonicalDomain(domains.y);
      const changesX =
        scope.x !== undefined && x !== undefined && !equalDomain(zoomX.get(scope.x), x);
      const changesY =
        scope.y !== undefined && y !== undefined && !equalDomain(zoomY.get(scope.y), y);
      if (!changesX && !changesY) return null;
      if (changesX && scope.x !== undefined && x !== undefined) zoomX.set(scope.x, x);
      if (changesY && scope.y !== undefined && y !== undefined) zoomY.set(scope.y, y);
      return commit("zoom", ["zoom"], scope, mutation.source ?? "programmatic");
    },
    resetZoom(mutation) {
      assertMutationAllowed();
      const scope = normalizedScope(mutation.scope);
      const changesX = scope.x !== undefined && zoomX.has(scope.x);
      const changesY = scope.y !== undefined && zoomY.has(scope.y);
      if (!changesX && !changesY) return null;
      if (changesX && scope.x !== undefined) zoomX.delete(scope.x);
      if (changesY && scope.y !== undefined) zoomY.delete(scope.y);
      return commit("zoom", ["zoom"], scope, mutation.source ?? "programmatic");
    },
    reconcileKeys(validKeys, mutation) {
      assertMutationAllowed();
      const scope = normalizedScope(mutation.scope);
      const valid = new Set(canonicalKeys(validKeys));
      const priorSelection = selections.get(scope.keys) ?? EMPTY_KEYS;
      const priorEmphasis = emphases.get(scope.keys) ?? EMPTY_KEYS;
      const nextSelection = Object.freeze(priorSelection.filter((key) => valid.has(key)));
      const nextEmphasis = Object.freeze(priorEmphasis.filter((key) => valid.has(key)));
      const selectionChanged = !equalKeys(priorSelection, nextSelection);
      const emphasisChanged = !equalKeys(priorEmphasis, nextEmphasis);
      // Interval records in the same key scope carry captured keys too;
      // reconciliation must prune them or union consumption keeps
      // publishing keys the owner declared invalid.
      const intervalScope = scope.intervals ?? scope.keys;
      const priorPanels = intervals.get(intervalScope);
      let intervalChanged = false;
      if (priorPanels !== undefined) {
        for (const [panelId, interval] of priorPanels) {
          const nextKeys = Object.freeze(interval.keys.filter((key) => valid.has(key)));
          if (equalKeys(interval.keys, nextKeys)) continue;
          intervalChanged = true;
          priorPanels.set(panelId, Object.freeze({ ...interval, keys: nextKeys }));
        }
      }
      if (!selectionChanged && !emphasisChanged && !intervalChanged) return null;
      if (selectionChanged) {
        if (nextSelection.length === 0) selections.delete(scope.keys);
        else selections.set(scope.keys, nextSelection);
      }
      if (emphasisChanged) {
        if (nextEmphasis.length === 0) emphases.delete(scope.keys);
        else emphases.set(scope.keys, nextEmphasis);
      }
      const changes = Object.freeze([
        ...(selectionChanged ? (["selection"] as const) : []),
        ...(emphasisChanged ? (["emphasis"] as const) : []),
        ...(intervalChanged ? (["interval"] as const) : []),
      ]);
      return commit("reconcile", changes, scope, mutation.source ?? "programmatic");
    },
  };
  return Object.freeze(controller);
}
