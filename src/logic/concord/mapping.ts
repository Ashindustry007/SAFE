export interface ConcordMappingConfig {
  modelWidthFt: number;
  modelHeightFt: number;
  gridWidth: number;
  gridHeight: number;
  cellSizeFt: number;
}

export function uvToFeet(u: number, v: number, cfg: ConcordMappingConfig) {
  const uu = Math.min(1, Math.max(0, u));
  const vv = Math.min(1, Math.max(0, v));
  // v=0 at bottom in model space; in three plane UV, v increases upward,
  // but our Terrain3D mapping uses (1 - v) for grid Y.
  return {
    xFt: uu * cfg.modelWidthFt,
    yFt: (1 - vv) * cfg.modelHeightFt,
  };
}

export function feetToGrid(xFt: number, yFt: number, cfg: ConcordMappingConfig) {
  const gx = Math.min(cfg.gridWidth - 1, Math.max(0, Math.floor(xFt / cfg.cellSizeFt)));
  const gy = Math.min(cfg.gridHeight - 1, Math.max(0, Math.floor(yFt / cfg.cellSizeFt)));
  return { gx, gy };
}

