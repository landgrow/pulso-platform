import { describe, it, expect } from "vitest";
import {
  clampMapScale,
  DEFAULT_MAP_VIEW,
  panMapView,
  zoomMapView,
} from "@/lib/mindmaps/viewport";

describe("map viewport", () => {
  it("clamps zoom between 25% and 250%", () => {
    expect(clampMapScale(0.01)).toBe(0.25);
    expect(clampMapScale(8)).toBe(2.5);
  });

  it("keeps the world point under the cursor when zooming", () => {
    const view = { x: 40, y: 20, scale: 1 };
    const pointer = { x: 200, y: 100 };
    const next = zoomMapView(view, pointer, 2);
    const beforeX = (pointer.x - view.x) / view.scale;
    const afterX = (pointer.x - next.x) / next.scale;
    expect(afterX).toBeCloseTo(beforeX);
    expect(next.scale).toBe(2);
  });

  it("pans by pointer delta", () => {
    const next = panMapView(DEFAULT_MAP_VIEW, { x: 12, y: -4 });
    expect(next.x).toBe(DEFAULT_MAP_VIEW.x + 12);
    expect(next.y).toBe(DEFAULT_MAP_VIEW.y - 4);
    expect(next.scale).toBe(1);
  });
});
