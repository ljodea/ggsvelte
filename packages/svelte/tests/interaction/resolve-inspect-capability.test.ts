/**
 * Pure resolve of host inspect capability from prop + capability children.
 */
import { describe, expect, it } from "vitest";

import {
  droppedInspectIdentityDiagnostics,
  duplicateInspectCapabilityDiagnostics,
  resolveInspectCapability,
  type InspectCapabilityChild,
} from "../../src/lib/interaction/resolve-inspect-capability.js";

describe("resolveInspectCapability", () => {
  it("is off when prop and children are absent", () => {
    expect(resolveInspectCapability({})).toEqual({
      input: false,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
    expect(resolveInspectCapability({ prop: undefined, children: [] })).toEqual({
      input: false,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });

  it("passes through prop true and object when no children", () => {
    expect(resolveInspectCapability({ prop: true })).toEqual({
      input: true,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
    const options = { mode: "xy" as const, pin: false };
    expect(resolveInspectCapability({ prop: options })).toEqual({
      input: options,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });

  it("treats prop false as off when no children", () => {
    expect(resolveInspectCapability({ prop: false })).toEqual({
      input: false,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });

  it("enables from an empty child bag (≡ inspect={true})", () => {
    expect(resolveInspectCapability({ children: [{}] })).toEqual({
      input: true,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });

  it("uses the last child's options bag whole (no deep-merge with prop)", () => {
    const child: InspectCapabilityChild = { mode: "xy", pin: false };
    expect(
      resolveInspectCapability({
        prop: { mode: "x", pin: true, muteSiblings: true },
        children: [child],
      }),
    ).toEqual({
      input: child,
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });

  it("child wins over prop false", () => {
    expect(resolveInspectCapability({ prop: false, children: [{ mode: "exact" }] })).toEqual({
      input: { mode: "exact" },
      multiChild: false,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });

  it("last of multiple children wins and multiChild is true", () => {
    const last: InspectCapabilityChild = { mode: "y" };
    expect(
      resolveInspectCapability({
        children: [{ mode: "x" }, last],
      }),
    ).toEqual({
      input: last,
      multiChild: true,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });
});

describe("resolveInspectCapability row identity", () => {
  it("reports the identity the prop asks for when no child overrides it", () => {
    expect(resolveInspectCapability({ prop: { identity: "year" } }).identity).toBe("year");
    expect(resolveInspectCapability({ prop: true }).identity).toBeUndefined();
    expect(resolveInspectCapability({}).identity).toBeUndefined();
  });

  it("reports the winning child's identity", () => {
    expect(
      resolveInspectCapability({ prop: { identity: "year" }, children: [{ identity: "state" }] })
        .identity,
    ).toBe("state");
    expect(
      resolveInspectCapability({ children: [{ identity: "a" }, { identity: "b" }] }).identity,
    ).toBe("b");
  });

  it("flags a prop identity that a child drops, instead of losing it in silence", () => {
    // <GGPlot inspect={{ identity: "year" }}><Inspect /></GGPlot> — REPLACE
    // semantics mean the empty child wins and "year" never reaches the engine.
    const dropped = resolveInspectCapability({ prop: { identity: "year" }, children: [{}] });
    expect(dropped.identity).toBeUndefined();
    expect(dropped.droppedPropIdentity).toBe(true);

    // A child that names its own identity is a deliberate override, not a loss.
    const overridden = resolveInspectCapability({
      prop: { identity: "year" },
      children: [{ identity: "state" }],
    });
    expect(overridden.droppedPropIdentity).toBe(false);

    // Nothing to drop when the prop never named an identity.
    expect(
      resolveInspectCapability({ prop: { mode: "x" }, children: [{}] }).droppedPropIdentity,
    ).toBe(false);
    expect(resolveInspectCapability({ prop: { identity: "year" } }).droppedPropIdentity).toBe(
      false,
    );
  });
});

describe("droppedInspectIdentityDiagnostics", () => {
  it("emits only when a prop identity was dropped", () => {
    expect(droppedInspectIdentityDiagnostics(false)).toEqual([]);
    const list = droppedInspectIdentityDiagnostics(true);
    expect(list).toHaveLength(1);
    expect(list.at(0)?.code).toBe("INTERACTION_INSPECT_IDENTITY_DROPPED");
  });
});

describe("duplicateInspectCapabilityDiagnostics", () => {
  it("emits only when multiChild", () => {
    expect(duplicateInspectCapabilityDiagnostics(false)).toEqual([]);
    const list = duplicateInspectCapabilityDiagnostics(true);
    expect(list).toHaveLength(1);
    expect(list.at(0)?.code).toBe("INTERACTION_DUPLICATE_INSPECT_CAPABILITY");
  });
});
