import type { IFireEngineConfig } from "./engine/fire-engine";

/** Defaults aligned with SimulationView3D / typical Concord staging runs. */
export function getDefaultFireEngineConfig(
  gridWidth: number,
  gridHeight: number,
  cellSizeFt = 100
): IFireEngineConfig {
  return {
    gridWidth,
    gridHeight,
    cellSize: cellSizeFt,
    minCellBurnTime: 200,
    neighborsDist: 2.5,
    fireSurvivalProbability: 0.1,
  };
}
