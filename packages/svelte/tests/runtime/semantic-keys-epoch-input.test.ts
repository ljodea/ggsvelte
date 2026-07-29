/**
 * #852 — pure host-side data-identity epoch input assembly + content tokens.
 *
 * Browser lane: plot-engine imports these helpers; CI coverage is browser-only
 * (SSR vitest does not collect), so the suite lives here.
 */
import { describe, expect, it } from "vitest";

import {
  buildDataIdentityEpochInput,
  dataContentOrderToken,
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

describe("dataContentOrderToken edge forms", () => {
  it("fingerprints named DataRefs, single-key values bags, and non-row primitives", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    expect(dataContentOrderToken(null, id)).toBe("null");
    expect(dataContentOrderToken(undefined, id)).toBe("null");
    expect(dataContentOrderToken({ name: "mpg" }, id)).toBe("n:mpg");
    const rowA = { x: 1 };
    const rowB = { x: 2 };
    const valuesBag = { values: [rowA, rowB] };
    const valuesToken = dataContentOrderToken(valuesBag, id);
    expect(valuesToken).toBe(`v:2:${id(rowA)}:${id(rowB)}`);
    // Same row refs → stable; reverse bumps order.
    valuesBag.values.reverse();
    expect(dataContentOrderToken(valuesBag, id)).toBe(`v:2:${id(rowB)}:${id(rowA)}`);
    expect(dataContentOrderToken("inline", id)).toBe("p:inline");
    expect(dataContentOrderToken(42, id)).toBe("p:42");
    expect(dataContentOrderToken(true, id)).toBe("p:true");
    expect(dataContentOrderToken(10n, id)).toBe("p:10");
    // Non-JSON primitives (symbol) fall through to sourceIdentity.
    const sym = Symbol("row");
    expect(dataContentOrderToken(sym, id)).toBe(`p:${id(sym)}`);
  });

  it("falls back to source identity for non-column objects and bare columns wrapper", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const odd = { notRows: 1, meta: "x" };
    expect(dataContentOrderToken(odd, id)).toBe(`o:${id(odd)}`);
    // Single-key { columns } uses the column-map path.
    const x = [1, 2];
    const y = [3, 4];
    const wrapped = dataContentOrderToken({ columns: { x, y } }, id);
    expect(wrapped.startsWith("c:")).toBe(true);
    expect(wrapped).toContain(id(x));
    expect(wrapped).toContain(id(y));
  });

  it("includes named datasets in the epoch via datasetsOrderToken", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const rowsA = [{ x: 1 }];
    const rowsB = [{ x: 2 }];
    const withA = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data: null,
      datasets: { a: rowsA },
      sourceIdentity: id,
    });
    const withB = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data: null,
      datasets: { a: rowsB },
      sourceIdentity: id,
    });
    const withBoth = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data: null,
      datasets: { a: rowsA, b: rowsB },
      sourceIdentity: id,
    });
    expect(withA).not.toBe(withB);
    expect(withBoth).not.toBe(withA);
    // Non-object datasets fall through to source identity.
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data: null,
        datasets: "named-bag",
        sourceIdentity: id,
      }),
    ).toContain(id("named-bag"));
  });
});
