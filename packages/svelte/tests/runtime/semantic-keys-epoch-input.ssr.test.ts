/**
 * #852 — pure host-side data-identity epoch input assembly.
 * SSR lane: markLayers vs layers-prop, ready-without-assembled, content pick.
 */
import { describe, expect, it } from "vitest";

import {
  buildDataIdentityEpochInput,
  dataIdentityEpochToken,
} from "../../src/lib/runtime/semantic-data-identity.js";
import { createSourceIdentityTracker } from "../../src/lib/runtime/semantic-source-identity.js";

describe("buildDataIdentityEpochInput", () => {
  it("uses registry markLayers when the layers prop is absent (not union layers)", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const markRows = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    // markLayers expose .data; a widened registry.layers entry would not.
    const markLayers = [{ data: markRows }];
    const input = buildDataIdentityEpochInput({
      data: undefined,
      spec: undefined,
      layers: undefined,
      registryMarkLayers: markLayers,
      sourceIdentity: id,
    });
    expect(input.ready).toBe(true);
    expect(input.layers).toEqual(markLayers);
    // Token must include layer-local data (#609).
    expect(dataIdentityEpochToken(input)).not.toBe(
      dataIdentityEpochToken({
        ...input,
        layers: [],
      }),
    );
  });

  it("prefers the layers prop over registry markLayers when provided", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const propRows = [{ x: 10, y: 20 }];
    const markRows = [{ x: 1, y: 2 }];
    const input = buildDataIdentityEpochInput({
      data: undefined,
      spec: undefined,
      layers: [{ data: propRows }, { data: undefined }],
      registryMarkLayers: [{ data: markRows }],
      sourceIdentity: id,
    });
    expect(input.layers).toEqual([{ data: propRows }, { data: undefined }]);
    // Prop path must not silently fingerprint markLayers instead.
    const viaMarkOnly = buildDataIdentityEpochInput({
      data: undefined,
      spec: undefined,
      layers: undefined,
      registryMarkLayers: [{ data: markRows }],
      sourceIdentity: id,
    });
    expect(dataIdentityEpochToken(input)).not.toBe(dataIdentityEpochToken(viaMarkOnly));
  });

  it("is ready from spec or layers without reading assembled", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    // Spec alone → ready (chrome-only respec path must not need assembled).
    expect(
      buildDataIdentityEpochInput({
        data: undefined,
        spec: { data: [{ x: 1 }] },
        layers: undefined,
        registryMarkLayers: [],
        sourceIdentity: id,
      }).ready,
    ).toBe(true);
    // Layers alone (mark registry) → ready.
    expect(
      buildDataIdentityEpochInput({
        data: undefined,
        spec: undefined,
        layers: undefined,
        registryMarkLayers: [{ data: [{ x: 1 }] }],
        sourceIdentity: id,
      }).ready,
    ).toBe(true);
    // Empty layers prop: length 0 → not ready; markLayers are ignored when prop is set.
    expect(
      buildDataIdentityEpochInput({
        data: [{ x: 1 }],
        spec: undefined,
        layers: [],
        registryMarkLayers: [{ data: [{ x: 99 }] }],
        sourceIdentity: id,
      }).ready,
    ).toBe(false);
    // No spec, no layers → not ready even if a data prop exists.
    expect(
      buildDataIdentityEpochInput({
        data: [{ x: 1 }],
        spec: undefined,
        layers: undefined,
        registryMarkLayers: [],
        sourceIdentity: id,
      }).ready,
    ).toBe(false);
  });

  it("fingerprints spec content data/datasets when an explicit spec object wins", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const propData = [{ x: 1 }];
    const specData = [{ x: 9 }];
    const shared = { a: [{ n: 1 }] };
    const withSpec = buildDataIdentityEpochInput({
      data: propData,
      spec: { data: specData, datasets: shared },
      layers: undefined,
      registryMarkLayers: [],
      sourceIdentity: id,
    });
    // assemblePortableSpec: explicit spec wins — prop data must not be fingerprinted.
    expect(withSpec.data).toBe(specData);
    expect(withSpec.datasets).toBe(shared);
    const withoutSpec = buildDataIdentityEpochInput({
      data: propData,
      spec: undefined,
      layers: undefined,
      registryMarkLayers: [],
      sourceIdentity: id,
    });
    expect(withoutSpec.data).toBe(propData);
    expect(withoutSpec.datasets).toBeNull();
    // Same identity tracker → different content tokens because data sources differ.
    expect(dataIdentityEpochToken({ ...withSpec, ready: true })).not.toBe(
      dataIdentityEpochToken({ ...withoutSpec, ready: true }),
    );
  });

  it("emits stable prop tokens via sourceIdentity for data and spec refs", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const data = [{ x: 1 }];
    const spec = { data: [{ x: 2 }] };
    const first = buildDataIdentityEpochInput({
      data,
      spec,
      layers: undefined,
      registryMarkLayers: [],
      sourceIdentity: id,
    });
    const second = buildDataIdentityEpochInput({
      data,
      spec,
      layers: undefined,
      registryMarkLayers: [],
      sourceIdentity: id,
    });
    expect(first.dataToken).toBe(second.dataToken);
    expect(first.specToken).toBe(second.specToken);
    expect(first.dataToken).toBe(id(data));
    expect(first.specToken).toBe(id(spec));
  });
});
