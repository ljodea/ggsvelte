/**
 * Shared builders for pure surface/pointer decision-table suites.
 */
import type {
  SurfaceClickInput,
  SurfacePointerDownInput,
  SurfacePointerMoveInput,
  SurfacePointerUpInput,
} from "../../src/lib/surface/pointer.js";

const downPoint = { x: 9, y: 8 } as const;
export const draftCorners = { x0: 10, y0: 20, x1: 10, y1: 20 } as const;
const endAt = { x: 40, y: 50 } as const;

export const down = (
  overrides: Partial<SurfacePointerDownInput> & Pick<SurfacePointerDownInput, "activeTool">,
): SurfacePointerDownInput => ({
  pointerType: "mouse",
  button: 0,
  areaAwaitingSecond: false,
  brushCorners: null,
  point: downPoint,
  ...overrides,
});

export const defaultInspect = {
  mode: "auto" as const,
  maxDistance: 24,
  pin: false,
};

export const up = (
  overrides: Partial<SurfacePointerUpInput> & Pick<SurfacePointerUpInput, "activeTool">,
): SurfacePointerUpInput => ({
  pointerType: "mouse",
  inspect: defaultInspect,
  hasTouchInspectStart: false,
  touchInspectMoved: false,
  brushing: false,
  brushCorners: null,
  endPoint: endAt,
  ...overrides,
});

export const click = (
  overrides: Partial<SurfaceClickInput> & Pick<SurfaceClickInput, "activeTool">,
): SurfaceClickInput => ({
  suppressClick: false,
  pointSelectEnabled: false,
  inspectEnabled: true,
  pinEnabled: false,
  hasInspection: false,
  ...overrides,
});

export const move = (
  overrides: Partial<SurfacePointerMoveInput> & Pick<SurfacePointerMoveInput, "activeTool">,
): SurfacePointerMoveInput => ({
  pointerType: "mouse",
  touchInspectMoved: false,
  hasTouchInspectStart: false,
  brushing: false,
  hasBrushDraft: false,
  inspect: defaultInspect,
  ...overrides,
});
