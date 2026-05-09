import { describe, it, expect } from "vitest";
import { uvToFeet, feetToGrid } from "./mapping";

const cfg = {
  modelWidthFt: 120000,
  modelHeightFt: 80000,
  gridWidth: 240,
  gridHeight: 160,
  cellSizeFt: 500,
};

describe("Concord mapping", () => {
  it("uv -> feet clamps to bounds", () => {
    expect(uvToFeet(-1, 2, cfg)).toEqual({ xFt: 0, yFt: 0 });
    expect(uvToFeet(2, -1, cfg)).toEqual({ xFt: 120000, yFt: 80000 });
  });

  it("feet -> grid maps to valid indices", () => {
    expect(feetToGrid(0, 0, cfg)).toEqual({ gx: 0, gy: 0 });
    expect(feetToGrid(119999, 79999, cfg)).toEqual({ gx: 239, gy: 159 });
  });

  it("center uv maps near center grid", () => {
    const { xFt, yFt } = uvToFeet(0.5, 0.5, cfg);
    const { gx, gy } = feetToGrid(xFt, yFt, cfg);
    expect(gx).toBeGreaterThan(90);
    expect(gx).toBeLessThan(150);
    expect(gy).toBeGreaterThan(50);
    expect(gy).toBeLessThan(110);
  });
});

