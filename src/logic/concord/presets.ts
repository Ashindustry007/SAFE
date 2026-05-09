/**
 * Concord wildfire-model style presets (MIT, concord-consortium/wildfire-model).
 * Zone templates + zoneIndex layouts expanded to a full Cell[] grid.
 */

import { Vegetation, TerrainType, DroughtLevel } from "./types";
import { Zone } from "./zone";
import { Cell } from "./cell";

export interface ConcordPresetZone {
  terrainType: TerrainType;
  vegetation: Vegetation;
  droughtLevel: DroughtLevel;
}

export interface ConcordPresetDefinition {
  id: string;
  zones: ConcordPresetZone[];
  /** Row-major zone indices; any number of rows (concord complexZones), or one row repeated per plan */
  zoneIndex: number[][];
  /** Optional river strip (center Y fraction + half-width in cells) */
  river?: { centerYFrac: number; halfWidthCells: number };
}

/** Layout inspired by production defaultThreeZone + towns placement (concord presets). */
export const PRESET_DEFAULT_THREE_ZONE: ConcordPresetDefinition = {
  id: "defaultThreeZone",
  zones: [
    {
      terrainType: TerrainType.Mountains,
      vegetation: Vegetation.Forest,
      // Match Concord screenshot labels (Forest • Severe).
      droughtLevel: DroughtLevel.SevereDrought,
    },
    {
      terrainType: TerrainType.Foothills,
      vegetation: Vegetation.Shrub,
      // Shrub • Medium
      droughtLevel: DroughtLevel.MediumDrought,
    },
    {
      terrainType: TerrainType.Plains,
      vegetation: Vegetation.Grass,
      // Grass • Mild
      droughtLevel: DroughtLevel.MildDrought,
    },
  ],
  zoneIndex: [[0, 1, 2]],
  river: { centerYFrac: 0.6, halfWidthCells: 2.5 },
};

export const PRESET_DRY_TOWNS_THREE_ZONE: ConcordPresetDefinition = {
  id: "dryTownsThreeZone",
  zones: [
    {
      terrainType: TerrainType.Mountains,
      vegetation: Vegetation.Forest,
      droughtLevel: DroughtLevel.MildDrought,
    },
    {
      terrainType: TerrainType.Foothills,
      vegetation: Vegetation.Shrub,
      droughtLevel: DroughtLevel.MediumDrought,
    },
    {
      terrainType: TerrainType.Plains,
      vegetation: Vegetation.Shrub,
      droughtLevel: DroughtLevel.MediumDrought,
    },
  ],
  zoneIndex: [[0, 1, 2]],
  river: { centerYFrac: 0.62, halfWidthCells: 2 },
};

export const PRESET_TWO_ZONE: ConcordPresetDefinition = {
  id: "defaultTwoZone",
  zones: [
    {
      terrainType: TerrainType.Foothills,
      vegetation: Vegetation.Grass,
      droughtLevel: DroughtLevel.MediumDrought,
    },
    {
      terrainType: TerrainType.Foothills,
      vegetation: Vegetation.Shrub,
      droughtLevel: DroughtLevel.MildDrought,
    },
  ],
  zoneIndex: [[0, 1]],
};

const PRESET_MAP: Record<string, ConcordPresetDefinition> = {
  defaultThreeZone: PRESET_DEFAULT_THREE_ZONE,
  dryTownsThreeZone: PRESET_DRY_TOWNS_THREE_ZONE,
  defaultTwoZone: PRESET_TWO_ZONE,
};

export const CONCORD_PRESET_IDS = Object.keys(PRESET_MAP);

export function isConcordPresetId(id: string | null): id is keyof typeof PRESET_MAP & string {
  return id !== null && id in PRESET_MAP;
}

export function getConcordPreset(id: string): ConcordPresetDefinition | undefined {
  return PRESET_MAP[id];
}

function elevationBase(terrainType: TerrainType): number {
  switch (terrainType) {
    case TerrainType.Mountains:
      return 14000;
    case TerrainType.Foothills:
      return 7000;
    case TerrainType.Plains:
    default:
      return 1200;
  }
}

export function buildCellsFromConcordPreset(
  preset: ConcordPresetDefinition,
  width: number,
  height: number
): Cell[] {
  const cells: Cell[] = [];
  const rows = preset.zoneIndex;
  if (rows.length === 0 || rows[0].length === 0) {
    throw new Error("preset.zoneIndex must be non-empty");
  }

  const river = preset.river;

  // Concord fills terrain edges visually and blocks fire spread near edges.
  const edgeFill = true;
  const nonburnableBorder = 2; // cells

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const iy = rows.length === 1 ? 0 : Math.min(rows.length - 1, Math.floor((y / height) * rows.length));
      const row = rows[iy];
      const ix = Math.min(row.length - 1, Math.floor((x / width) * row.length));
      const zoneIdx = row[ix];

      const spec = preset.zones[zoneIdx];
      const zone = new Zone({
        vegetation: spec.vegetation,
        terrainType: spec.terrainType,
        droughtLevel: spec.droughtLevel,
      });

      // More realistic relief (mountains need ridges).
      const h1 = Math.sin(x * 0.065) * Math.cos(y * 0.065);
      const h2 = Math.sin(x * 0.022 + 2) * Math.cos(y * 0.022 + 1) * 2;
      const noise = (h1 + h2) / 3;
      const ridge = 1 - Math.abs(2 * Math.abs(noise) - 1);
      const ridgeBoost = Math.pow(Math.max(0, ridge), 3);

      let elevation = elevationBase(spec.terrainType);
      const amp = spec.terrainType === TerrainType.Mountains ? 0.55 : spec.terrainType === TerrainType.Foothills ? 0.30 : 0.10;
      elevation += noise * elevation * amp + ridgeBoost * elevation * (amp * 0.55);

      let isRiver = false;
      if (river) {
        const riverCenter = height * river.centerYFrac + Math.sin(x * 0.1) * 5;
        if (Math.abs(y - riverCenter) < river.halfWidthCells) {
          isRiver = true;
          elevation -= 800;
        }
      }

      const isEdge = edgeFill && (x === 0 || x === width - 1 || y === 0 || y === height - 1);
      const isNonburnableBorder =
        edgeFill && (x <= nonburnableBorder || x >= width - 1 - nonburnableBorder || y <= nonburnableBorder || y >= height - 1 - nonburnableBorder);

      cells.push(
        new Cell({
          x,
          y,
          zone,
          zoneIdx,
          baseElevation: isEdge ? 0 : elevation,
          isRiver,
          isUnburntIsland: isNonburnableBorder,
        })
      );
    }
  }

  return cells;
}
