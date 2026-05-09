import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FireEngine } from "./concord/engine/fire-engine";
import { FireState } from "./concord/cell";
import { getDefaultFireEngineConfig } from "./concord/engine-config";
import { buildTerrainGrid, PROCEDURAL_TERRAIN_ID } from "./wildfire3D";
import { buildCellsFromConcordPreset, PRESET_DEFAULT_THREE_ZONE } from "./concord/presets";

const W = 28;
const H = 18;
const CELL_FT = 100;

const cfg = getDefaultFireEngineConfig(W, H, CELL_FT);

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Concord FireEngine integration", () => {
  it("ignitionTime 0 on Unburnt becomes Burning once model time exceeds 0", () => {
    const cells = buildTerrainGrid(W, H, PROCEDURAL_TERRAIN_ID);
    const center =
      cells.find((c) => !c.isRiver && !c.isUnburntIsland && c.fireState === FireState.Unburnt) ?? cells[0];
    expect(center.fireState).toBe(FireState.Unburnt);
    center.ignitionTime = 0;

    const eng = new FireEngine(cells, { speed: 0, direction: 0 }, [], cfg);

    eng.updateFire(120);
    expect(center.fireState).toBe(FireState.Burning);
  });

  it("preserves FireEngine.day across ticks like upstream (no engine recreation)", () => {
    const cells = buildTerrainGrid(W, H, PROCEDURAL_TERRAIN_ID);
    const center =
      cells.find((c) => !c.isRiver && !c.isUnburntIsland && c.fireState === FireState.Unburnt) ?? cells[0];
    center.ignitionTime = 0;
    const eng = new FireEngine(cells, { speed: 2, direction: 90 }, [], cfg);

    let t = 0;
    for (let i = 0; i < 260; i++) {
      t += 6;
      eng.updateFire(t);
    }

    expect(eng.day).toBeGreaterThan(0);

    let dayBefore = eng.day;
    const tBefore = t;
    for (let i = 0; i < 500; i++) {
      t += 6;
      eng.updateFire(t);
    }

    expect(eng.day).toBeGreaterThanOrEqual(dayBefore);
    expect(t).toBeGreaterThan(tBefore);
  });

  it("east wind gives the eastern neighbour a finite ignition time after a lit cell burns", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const cells = buildCellsFromConcordPreset(PRESET_DEFAULT_THREE_ZONE, W, H);
    const iy = Math.floor(H / 2);
    let ix = Math.floor(W / 4);
    while (ix < W - 2 && cells[iy * W + ix].isRiver) {
      ix++;
    }
    const left = cells[iy * W + ix];
    const east = cells[iy * W + (ix + 1)];

    left.fireState = FireState.Unburnt;
    left.ignitionTime = 0;

    const eng = new FireEngine(cells, { speed: 20, direction: 90 }, [], cfg);

    let t = 0;
    while (east.ignitionTime === Infinity && t < 80000) {
      t += 12;
      eng.updateFire(t);
    }

    expect(east.ignitionTime).toBeLessThan(Infinity);
    expect(Number.isFinite(east.ignitionTime)).toBe(true);
    expect(left.fireState).toBe(FireState.Burning);
  });
});
