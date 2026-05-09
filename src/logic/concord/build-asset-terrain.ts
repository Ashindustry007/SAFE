import { Zone } from "./zone";
import { Cell } from "./cell";
import type { ConcordSimConfig } from "./default-config";
import { loadElevation, loadRiverMask, loadUnburntIslands, loadZoneIndex } from "./data/loaders";

const gridIndex = (x: number, y: number, w: number) => y * w + x;

export async function buildCellsFromAssets(cfg: ConcordSimConfig): Promise<Cell[]> {
  const zones = cfg.zones.map((z) => new Zone(z));

  const [zoneIndex1D, elevation1D, river1D, islands1D] = await Promise.all([
    loadZoneIndex(cfg.zoneIndex, cfg.gridWidth, cfg.gridHeight),
    loadElevation(cfg.elevation, cfg.gridWidth, cfg.gridHeight, cfg.heightmapMaxElevation),
    loadRiverMask(cfg.riverData ?? undefined, cfg.gridWidth, cfg.gridHeight),
    loadUnburntIslands(cfg.unburntIslands, cfg.gridWidth, cfg.gridHeight, cfg.unburntIslandProbability),
  ]);

  const cells: Cell[] = [];
  const nonburnableBorder = 2;

  for (let y = 0; y < cfg.gridHeight; y++) {
    for (let x = 0; x < cfg.gridWidth; x++) {
      const idx = gridIndex(x, y, cfg.gridWidth);
      const zi = zoneIndex1D ? (zoneIndex1D[idx] ?? 0) : 0;

      const isEdge =
        cfg.fillTerrainEdges &&
        (x === 0 || x === cfg.gridWidth - 1 || y === 0 || y === cfg.gridHeight - 1);
      const isNonBurnable =
        cfg.fillTerrainEdges &&
        (x <= nonburnableBorder ||
          x >= cfg.gridWidth - 1 - nonburnableBorder ||
          y <= nonburnableBorder ||
          y >= cfg.gridHeight - 1 - nonburnableBorder);

      const baseElevation = isEdge ? 0 : (elevation1D ? elevation1D[idx] : 0);
      const isRiver = river1D ? river1D[idx] > 0 : false;
      const isUnburntIsland = (islands1D ? islands1D[idx] > 0 : false) || isNonBurnable;

      cells.push(
        new Cell({
          x,
          y,
          zone: zones[zi],
          zoneIdx: zi,
          baseElevation,
          isRiver,
          isUnburntIsland,
        })
      );
    }
  }

  return cells;
}

