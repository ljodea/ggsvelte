import { createContext, useContext, useLayoutEffect, useRef } from "react";

import type { Layer, MarkLayerDescriptor } from "@ggsvelte/compose";

export type HostCapabilityKind = "inspect";

export type InspectCapabilityChild = Record<string, unknown>;

export type HostCapabilityValue = {
  readonly inspect: InspectCapabilityChild;
};

type CapabilityEntry<K extends HostCapabilityKind = HostCapabilityKind> = {
  readonly kind: K;
  get value(): HostCapabilityValue[K];
};

let nextId = 0;

export class LayerRegistry {
  readonly #byId = new Map<number, Layer>();
  readonly #capabilities = new Map<number, CapabilityEntry>();
  #version = 0;
  #capabilityVersion = 0;
  #registrationCount = 0;
  readonly #listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = (): number => this.#version + this.#capabilityVersion * 1_000_000;

  #emit(): void {
    for (const listener of this.#listeners) listener();
  }

  register(descriptor: MarkLayerDescriptor): number {
    return this.registerPlotLayer({ kind: "mark", descriptor });
  }

  /** Snapshot bump only — never notify from the render path (React 19). */
  registerPlotLayer(layer: Layer): number {
    const id = nextId++;
    this.#byId.set(id, layer);
    this.#registrationCount += 1;
    this.#version += 1;
    return id;
  }

  registerCapability<K extends HostCapabilityKind>(
    kind: K,
    getValue: () => HostCapabilityValue[K],
  ): number {
    const id = nextId++;
    this.#capabilities.set(id, {
      kind,
      get value() {
        return getValue();
      },
    });
    this.#registrationCount += 1;
    this.#capabilityVersion += 1;
    return id;
  }

  /** Safe after commit (layout effect). No-op when nobody is subscribed. */
  notify(): void {
    this.#emit();
  }

  unregister(id: number): void {
    const removedLayer = this.#byId.delete(id);
    const removedCapability = this.#capabilities.delete(id);
    if (removedLayer) this.#version += 1;
    if (removedCapability) this.#capabilityVersion += 1;
    if (removedLayer || removedCapability) this.#emit();
  }

  get layers(): readonly Layer[] {
    return [...this.#byId.values()];
  }

  get markLayers(): readonly MarkLayerDescriptor[] {
    const out: MarkLayerDescriptor[] = [];
    for (const layer of this.#byId.values()) {
      if (layer.kind === "mark") out.push(layer.descriptor);
    }
    return out;
  }

  capabilities<K extends HostCapabilityKind>(kind: K): readonly HostCapabilityValue[K][] {
    const out: HostCapabilityValue[K][] = [];
    for (const entry of this.#capabilities.values()) {
      if (entry.kind === kind) out.push(entry.value as HostCapabilityValue[K]);
    }
    return out;
  }

  get registrationCount(): number {
    return this.#registrationCount;
  }
}

export const PlotRegistryContext = createContext<LayerRegistry | null>(null);

export function usePlotRegistry(): LayerRegistry | null {
  return useContext(PlotRegistryContext);
}

/** Register during render with live getters; unregister on unmount (Strict Mode safe). */
export function useRegisterLayer(layer: Layer): void {
  const registry = usePlotRegistry();
  const idRef = useRef<number | null>(null);
  if (registry !== null && idRef.current === null) {
    idRef.current = registry.registerPlotLayer(layer);
  }
  useLayoutEffect(() => {
    registry?.notify();
    return () => {
      if (registry !== null && idRef.current !== null) {
        registry.unregister(idRef.current);
        idRef.current = null;
      }
    };
  }, [registry]);
}

export function useRegisterCapability<K extends HostCapabilityKind>(
  kind: K,
  getValue: () => HostCapabilityValue[K],
): void {
  const registry = usePlotRegistry();
  const idRef = useRef<number | null>(null);
  const getValueRef = useRef(getValue);
  getValueRef.current = getValue;
  if (registry !== null && idRef.current === null) {
    idRef.current = registry.registerCapability(kind, () => getValueRef.current());
  }
  useLayoutEffect(() => {
    registry?.notify();
    return () => {
      if (registry !== null && idRef.current !== null) {
        registry.unregister(idRef.current);
        idRef.current = null;
      }
    };
  }, [registry]);
}
