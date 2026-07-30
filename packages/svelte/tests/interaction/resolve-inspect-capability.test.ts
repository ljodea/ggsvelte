/**
 * Pure resolve of host inspect capability from prop + capability children.
 */
import { describe, expect, it } from "vitest";

import {
  duplicateInspectCapabilityDiagnostics,
  resolveInspectCapability,
  type InspectCapabilityChild,
} from "../../src/lib/interaction/resolve-inspect-capability.js";

describe("resolveInspectCapability", () => {
  it("is off when prop and children are absent", () => {
    expect(resolveInspectCapability({})).toEqual({ input: false, multiChild: false });
    expect(resolveInspectCapability({ prop: undefined, children: [] })).toEqual({
      input: false,
      multiChild: false,
    });
  });

  it("passes through prop true and object when no children", () => {
    expect(resolveInspectCapability({ prop: true })).toEqual({
      input: true,
      multiChild: false,
    });
    const options = { mode: "xy" as const, pin: false };
    expect(resolveInspectCapability({ prop: options })).toEqual({
      input: options,
      multiChild: false,
    });
  });

  it("treats prop false as off when no children", () => {
    expect(resolveInspectCapability({ prop: false })).toEqual({
      input: false,
      multiChild: false,
    });
  });

  it("enables from an empty child bag (≡ inspect={true})", () => {
    expect(resolveInspectCapability({ children: [{}] })).toEqual({
      input: true,
      multiChild: false,
    });
  });

  it("uses the last child's options bag whole (no deep-merge with prop)", () => {
    const child: InspectCapabilityChild = { mode: "xy", pin: false };
    expect(
      resolveInspectCapability({
        prop: { mode: "x", pin: true, muteSiblings: true },
        children: [child],
      }),
    ).toEqual({ input: child, multiChild: false });
  });

  it("child wins over prop false", () => {
    expect(resolveInspectCapability({ prop: false, children: [{ mode: "exact" }] })).toEqual({
      input: { mode: "exact" },
      multiChild: false,
    });
  });

  it("last of multiple children wins and multiChild is true", () => {
    const last: InspectCapabilityChild = { mode: "y" };
    expect(
      resolveInspectCapability({
        children: [{ mode: "x" }, last],
      }),
    ).toEqual({ input: last, multiChild: true });
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
